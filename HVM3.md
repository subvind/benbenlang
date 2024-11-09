# HVM3's Optimal Atomic Linker (with Polarization)

Atomic linking is at the heart of HVM's implementation: it is what allows
threads to collaborate towards massive parallelism. All major HVM versions
started with a better atomic linker. From slow, buggy locks (HVM1), to AtomicCAS
(HVM1.5), to AtomicSwap (HVM2), the algorithm became simpler and faster over the
years.

On the initial HVM3 implementation, I noticed that one of the cases on the
atomic linker never happened. After some reasoning, I now understand why, and
that information can be used to greatly simplify the algorithm. The result, I
believe, is, for the first time, an "Optimal Atomic Linker", in the sense it can
be performed with the minimal amount of CPU instructions. While the changes look
small, I believe this optimal shape will result in significant improvements in
performance, as it is the most frequent operation when evaluating HVM.

The main insight is that we now treat negative and positive terms differently.
On interactions, instead of taking both (i.e., swapping by 0), we take only the
positive term. Then, we 'move' it into the *location* of the negative term,
which will then call 'link' if needed. I'll document the algorithm below, and
provide a very informal proof.

## Memory Layout

Before we start, let's explain the polarized memory layout. It is basically the
same as
[HVM2](https://docs.google.com/viewer?url=https://raw.githubusercontent.com/HigherOrderCO/HVM/main/paper/HVM2.pdf),
except terms must always obey polarization. For example, the following Bend
program:

```javascript
Main = λt(t (λx(x) λy(y)))
```

Would be represented as:

```javascript
@main
  = +(-(+c -r) +r)
  & -(+(-y +y) -c) ~ +(-x +x)
```

Note that the root is always a positive term, redexes are always stored as
`-negative ~ +positive`, and two ends of a wire always have opposing polarities.
[Interaction Calculus](https://github.com/VictorTaelin/Interaction-Calculus)
terms are represented as follows:
- Lam: `+(-var +bod)`
- App: `-(+arg -ret)`
- Sup: `+{+tm1 +tm2}`
- Dup: `-{-dp1 -dp2}`

This also means that variables are always paired. The negative variable is
placed at the binder's port, and the positive variable is placed at any other
location of the program. For example, if we were to add polarity annotations to
vars in λ-terms, the CNat 1 would look like this: `λ-f. λ-x. (+f +x)`.

## Optimal Polarized Atomic Linker

Let's first define a simple Net representation in pseudo-Haskell, using a map
of terms, similar to HVM2:

```haskell
-- A Net is just a map of Locations to Terms
type Net = Map Location Term

-- A Location is just an integer
type Location = U64

-- A Term holds a tag and the location of its children
type Term = (Tag, Location)

-- A Tag specifies the Term's node type
data Tag
  = VAR | SUB -- pos/neg Var (aux wire)
  | NUL | ERA -- pos/neg Eraser Node
  | LAM | APP -- pos/neg Constructor Node
  | SUP | DUP -- pos/neg Duplicator Node
```

Let's also define a **valid net** as one that is structured with correct
polarities. That means every variable has a positive and negative occurrence in
the net. To implement the atomic linker, we must store, on every positive
variable, the location of the negative variable. The negative variable doesn't
need to store anything (its 'loc' field can be just 0).

An interaction is performed as before, except we 'take' only positive terms:

```haskell
-- The beta-reduction (APP-LAM interaction)
-- - neg_loc: the location of the negative node
-- - pos_loc: the location of the positive node
applam :: Location -> Location -> HVM ()
applam neg_loc pos_loc = do

  -- 1. Compute the location of each child term
  let arg_loc = neg_loc + 1
  let ret_loc = neg_loc + 2
  let var_loc = pos_loc + 1
  let bod_loc = pos_loc + 2

  -- 2. Take the positive terms
  arg_val <- swap arg_loc 0
  bod_val <- swap bod_loc 0

  -- 3. Move positive terms into negative locations
  move var_loc arg_val
  move ret_loc bod_val
```

That's important: if we took the negative terms, we would need to handle their
absence, making the logic more complex. To perform a link, we then 'move' the
positive term (which can be either a variable or a node) into the negative
term's location:

```haskell
-- Moves a positive term (var or node) into a negative location
move : Location -> Term -> HVM ()
move neg_loc pos = do 
  neg <- swap neg_loc pos
  if getTag neg == SUB
  then do
    return ()
  else do
    link neg pos
```

We start by atomically swapping the negative term's location by the positive
term, retrieving a negative term (since the net is valid). Then, there are two
options:

If the retrieved term is a negative node, we *link* it to the positive term.
(See below.)

If the retrieved term is a negative var, we do nothing. Note that this means the
positive term will be left in the negative location, temporarily violating the
valid-net condition. That's fine: we consider that this location has been casted
to a "substitution map entry" - i.e., it is not technically part of the net
anymore. We are always able to disambiguate, because the only other part of the
net that can point to this location is the positive counterpart of that var.
Yet, positive vars can't point to positive terms. So, when that happens, it
means that location is a substitution map entry.

Now, the atomic linker itself looks like this:

```haskell
-- Links a negative node with a positive term (var or node)
link : Term -> Term -> HVM ()
link neg pos = do
  if getTag pos == VAR
  then do
    neg_var <- swap (getLoc pos) neg
    if getTag neg_var == SUB 
    then do
      return ()
    else do
      move (getLoc pos) neg_var
  else do
    pushRedex neg pos
    return ()
```

Note this function should only be called with a negative *node*, never a
negative *var*.

It starts by checking if the positive term is a var. If so, we swap that
positive var's target (i.e., the location where its negative var counterpart is
supposed to be) by the negative node. Then, there are two cases:

If the term we retrieved is, indeed, the corresponding negative var, then, good
job: we just performed a cross-thread substitution without conflicts. The
negative node is now stored on the binding λ's location, and both occurrences of
that var are completely gone. We don't need to do anything else!

Now, if the retrieved term is NOT the corresponding negative var, then, what
could it be? Remember: vars always point to each-other, but there is one
exception: when a location has been "casted" to a substition map entry. That
only happens when we place a positive term in a negative location. That means
the term we retrieved is that positive term (var or node). We need to do
something with it, otherwise it will disappear! Thankfully, we know the negative
node will be now placed on that location. So, to complete the linking, all we
need to do is *move* the positive into that negative location. Interestingly,
this means information has been exchanged between two threads. That
innocent-looking recursive call captures *all* cross-thread communication that
can ever occur!

Finally, if the positive term was a node, that means we have formed a new active
pair. We push it to the bag and return.

And that's it! This completes the algorithm and proof.

## Conclusion and Notes

Making it that simple took years of efforts, from versions using lock (HVM1:
slow, buggy, infeasible on GPUs), to better versions using atomic
compare-and-swap (HVM1.5: worked on GPUs, but slow), to better, but still
imperfect versions using just atomic swap (HVM2: worked on GPUs, fast, but has
some limitations), to this one exploiting polarities, which, as far as I can
tell, is optimal, in the sense it requires the least amount of CPU instructions,
and has maximum expressivity.

For example, this new format allows for lazy evaluation, since positive vars
point to the negative variable location, allowing us to traverse the graph with
the good-old lazy evaluation algorithm; this wasn't possible on HVM2. It also
allows us to dispense the "subst map" that we had on HVM2, since we reuse the
negative binder locations to perform substitutions, effectively using 1/3 less
memory. It also allows other nice savings, like not needing to store anything on
negative vars, which simplifies the injection/readback algorithms, and so on.

I also like how polarity clears up the connection between Interaction
Combinators and the Interaction Calculus I proposed: the distinction between
lams/dups and sups/dups is just their polarity, and there *is* a reason to use
it on implementations. Note that we could omit the polarity tags (i.e., have
just CON instead of LAM/APP) since it is inferrable (as long as we keep the
memory organized as to respect polarization).

Finally, keep in mind all this polarity stuff has been known and discussed for a
long time, but, for whatever reason, I never realized it could be relevant to
fast implementations. Also, as T6 pointed in our Discord, perhaps polarization
isn't even needed to implement the algorithm above. He might be right, but it
did help me to arrive at it. He also pointed how polarity-based linking might
result in longest redirection chains, but I believe this can be addressed outside.

For completion, here is `duplam` in HVM3's setup:

```haskell
duplam :: Location -> Location -> HVM ()
duplam neg_loc pos_loc = do

  -- 1. Compute the location of each child term
  let dp1_loc = neg_loc + 1
  let dp2_loc = neg_loc + 2
  let var_loc = pos_loc + 1
  let bod_loc = pos_loc + 2

  -- 2. Take the positive terms
  bod_val <- swap bod_loc 0

  -- 3. Allocate new nodes
  co1_loc <- alloc 3
  co2_loc <- alloc 3
  du1_loc <- alloc 3
  du2_loc <- alloc 3

  -- 4. Fill the new nodes
  set (co1_loc + 1) (SUB, co1_loc + 1)
  set (co1_loc + 2) (VAR, du2_loc + 1)
  set (co2_loc + 1) (SUB, co2_loc + 1)
  set (co2_loc + 2) (VAR, du2_loc + 2)
  set (du1_loc + 1) (VAR, co1_loc + 1)
  set (du1_loc + 2) (VAR, co2_loc + 1)
  set (du2_loc + 1) (SUB, du2_loc + 1)
  set (du2_loc + 2) (SUB, du2_loc + 2)

  -- 5. Move positive terms into negative locations
  move dp1_loc (LAM, co1_loc)
  move dp2_loc (LAM, co2_loc)
  move var_loc (SUP, du1_loc)
  link (DUP, du2) bod_val
```

Again, it is almost the same as the HVM2 version, with the subtle difference
that we only take positive terms, and move them into negative locations.

[Here's](https://gist.github.com/VictorTaelin/997260bc68dc35acb82960051176daf4)
a snapshot of the complete implementation using
[Kind-Lang](https://github.com/HigherOrderCO/Kind). To run it, you need to
download the [KindBook](https://github.com/HigherOrderCO/kindbook) library.