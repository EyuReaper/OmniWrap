/**
 * lint-staged config for the npm-workspaces monorepo.
 *
 * v17 executes command strings WITHOUT a shell (split-on-spaces, no operators,
 * no quote processing) — so this stays one simple invocation and all real work
 * happens inside scripts/eslint-staged.mjs, which runs the apps/web ESLint
 * binary from apps/web (see that file for why cwd matters). lint-staged
 * appends each matched file path as an argument.
 */
export default {
  'apps/web/**/*.{ts,tsx}': 'node scripts/eslint-staged.mjs',
};
