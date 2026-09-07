import { createContext, useContext } from "react";

// StepNode рендерится через nodeTypes (реестр компонентов reactflow) и не получает пропы
// напрямую от ScenarioGraph/страницы — контекст вместо data.* поля, чтобы не тащить callback
// в StepNodeData (которая маппится в/из ScenarioRequest и должна оставаться сериализуемым DTO).
// Не null только когда ScenarioGraph получил onRunFromNode (сейчас — только в редакторе,
// mode='edit'; в мониторе прогона проп не передаётся, и кнопка на нодах не появляется).
type RunFromNodeHandler = (stepId: number, stepName: string) => void;

export const RunFromNodeContext = createContext<RunFromNodeHandler | null>(null);

export function useRunFromNode(): RunFromNodeHandler | null {
  return useContext(RunFromNodeContext);
}
