# Void Stranger Solver

For now, just for solving brands.

This uses pnpm, but you can probably use npm basically interchangeably.

Install dependencies:

```
pnpm i
```

Solve a brane/brand combo by name:

```
pnpm run dev --brane Eus --brand Cif --verbose=2
```

Run all the fast tests:

```
pnpm run test
```

Run the slow Eus partial solution validation tests (these were useful when debugging the solver on Eus):

```
VERBOSE=1 node --require ts-node/register --test src/eus.test.ts
```

Verbose flags are optional. Also I need to dedupe them.
