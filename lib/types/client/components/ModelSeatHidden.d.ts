import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/**
 * 模型座位遮蔽（2026-09-28，拾贝起源部署）：渲染为空。
 *
 * 部署只有一个内置模型（qwen3.6-35b-a3b，模型固定），前端不提供模型/思考等级
 * 选择。座位 `conversation.input.model` 是宿主声明、dsh-client-ui-model-selection
 * 注册的 **single** 槽（优先级默认 0）；本插件以 `priority: -1` 遮蔽它——slots
 * 运行时语义：lowest renders，同优先级二次注册才抛错。渲染 null = 座位消失。
 *
 * 不搬宿主 React 节点、不改宿主源码、不碰 CSS 媒体分支；宿主没有该槽位声明的
 * 旧代际上 inject 回调不触发（惰性）。升级宿主时若座位改名/退役，本注册随之失效
 * （座位回来，无破坏）。
 */
export declare function ModelSeatHidden(_props: PropsRuntime<'conversation.input.model'>): null;
//# sourceMappingURL=ModelSeatHidden.d.ts.map