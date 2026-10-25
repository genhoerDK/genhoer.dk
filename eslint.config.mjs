import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
    ...nextVitals,
    {
        rules: {
            // Static export: images are served pre-optimized from cdn.genhoer.dk, so next/image adds nothing
            "@next/next/no-img-element": "off",
            // Rule added in Next 16. The flagged patterns (reset/derive state in an effect) work fine here,
            // so it's a hint for future cleanup rather than an error
            "react-hooks/set-state-in-effect": "warn",
        },
    },
];

export default eslintConfig;
