import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: "./wrangler.jsonc" },
				miniflare: {
					// wrangler.jsonc has no ADMIN_PASSWORD (it's a real secret, not a var),
					// so protected-route tests need one supplied here instead.
					bindings: { ADMIN_PASSWORD: "test-admin" },
				},
			},
		},
	},
});
