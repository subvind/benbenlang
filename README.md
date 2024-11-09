benbenlang
========

### A compiler from JavaScript-like syntax to Interaction Nets

Core Functionality:
```benben
# this is a comment

#{
  this is a block comment
#}

# string value:
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

# boolean values:
const yes = N; # true 
const no = Z; # false

# print to the console:
>log: "Hello World!";

# function declarations multi arg:
\add (x, y) in
  return x + y;
dec

# function declarations single arg:
\say string in
  >log: string;
dec

# arrow functions:
let addPlusOneTo = x -> x + 1;

# let/const declarations:
let a = 1;
let b = 2;
const c = 3;

# function calls with multi arg:
add(a, b); # this returns the number three

# function calls with single arg:
addPlusOneTo: c; # this returns the number four

# conditionals (1):
if yes then true else false end

# conditionals (2):
if a > b then
  say: "a is more than b";
else
  say: "a is less than b";
end

# switch statements
switch x = 5 in
  case 0:
    return 6;
  case 1:
    return 7;
  case _:
    return x - 2;
state
```

Example Program:
```benben
# data types
type Option with
  Some { value }
  None
data

# function with match statement
\get_option_value option in
  match option in
    case Option/Some:
      return option.value
    case Option/None:
      return "No value"
  state
dec

# required main functon to start program
\main in
  my_option = Option/Some { value: "Bend is great!" }
  return get_option_value: my_option;
dec
```