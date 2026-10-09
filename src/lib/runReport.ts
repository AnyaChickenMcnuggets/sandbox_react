// HTML-отчёт нельзя встраивать (iframe/innerHTML запрещены заголовками) и нельзя показать через
// fetch — только отдельный документ по ссылке в новой вкладке; куки уходят сами (same-origin).
// Бэкенд отвечает 409, пока прогон выполняется — ссылку показываем только для завершённых.
export function runReportUrl(runId: number): string {
  return `/api/v1/runs/${runId}/report`;
}
