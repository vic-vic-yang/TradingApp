import { z } from "zod";

export const analyzeFormSchema = z
  .object({
    ticker: z.string().min(1, "请填写标的代码"),
    llmProvider: z.string().min(1),
    deepModelId: z.string().min(1, "请选择深度模型"),
    quickModelId: z.string().min(1, "请选择快速模型"),
    customDeep: z.string(),
    customQuick: z.string(),
    researchDepth: z.enum(["1", "3", "5"]),
    checkpoint: z.boolean(),
    analysts: z.record(z.string(), z.boolean()),
  })
  .refine((d) => Object.values(d.analysts).some(Boolean), {
    message: "至少选择一位分析师",
    path: ["analysts"],
  })
  .refine((d) => d.deepModelId !== "custom" || d.customDeep.trim().length > 0, {
    message: "请填写自定义深度模型 ID",
    path: ["customDeep"],
  })
  .refine((d) => d.quickModelId !== "custom" || d.customQuick.trim().length > 0, {
    message: "请填写自定义快速模型 ID",
    path: ["customQuick"],
  });

export type AnalyzeFormValues = z.infer<typeof analyzeFormSchema>;
