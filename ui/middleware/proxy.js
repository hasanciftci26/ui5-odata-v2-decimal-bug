const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function ({ log, middlewareUtil, options, resources }) {
    const supplyChainProxy = createProxyMiddleware({
        context: "/odata/v2/supply-chain",
        target: "http://localhost:4004",
        changeOrigin: true,
        pathRewrite: {
            "^/odata/v2/supply-chain": "/odata/v2/supply-chain"
        },
        secure: false
    });

    return function (req, res, next) {
        if (req.url.startsWith("/odata/v2/supply-chain")) {
            supplyChainProxy(req, res, next);
        } else {
            next();
        }
    };
};