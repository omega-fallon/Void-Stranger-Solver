# Void Stranger Solver
For now, just for solving brands.

Install dependencies:
```
pnpm i
```

Solve a brand by name:
```
pnpm run dev --brand Eus --verbose
```

Run all the fast tests:
```
pnpm run test
```

Run the slow Eus partial solution validation tests (these were useful when debugging the solver on Eus):
```
VERBOSE=true node --require ts-node/register --test src/eus.test.ts
```

Verbose flags are optional. Also I need to dedupe them.
