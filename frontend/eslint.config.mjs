import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "VariableDeclarator[id.name='Symbol']",
          message: "React Compiler의 Symbol.for 캐시와 충돌하므로 전역 Symbol 이름을 가리지 마세요.",
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "public/vendor/ffmpeg-core/**",
    "storybook-static/**",
    "next-env.d.ts",
  ]),
]);
