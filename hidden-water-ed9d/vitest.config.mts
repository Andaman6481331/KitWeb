import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: "./wrangler.jsonc" },
				miniflare: {
					// wrangler.jsonc has no ADMIN_PASSWORD (it's a real secret, not a var),
					// so protected-route tests need one supplied here instead.
					// The LINE credentials are secrets too; /order/submit 500s without them,
					// and the pushes themselves are intercepted with fetchMock in the tests.
					bindings: {
						ADMIN_PASSWORD: "test-admin",
						LINE_CHANNEL_ACCESS_TOKEN: "test-line-token",
						LINE_USER_ID: "Utest-staff",
					},
				},
			},
		},
	},
});
