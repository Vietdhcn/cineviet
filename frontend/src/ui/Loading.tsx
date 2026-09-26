export function Loading({ label = 'Đang chuẩn bị suất chiếu…' }: { label?: string }) {
  return <div className="loading-state" role="status" aria-live="polite"><span className="loading-state__light" />{label}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="message message--error" role="alert"><strong>Chưa thể hoàn tất.</strong><span>{message}</span>{retry && <button className="button button--quiet" onClick={retry}>Thử lại</button>}</div>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-state__screen" aria-hidden="true" /><h2>{title}</h2><p>{body}</p>{action}</div>;
}

