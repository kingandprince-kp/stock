export type SecurityIdentity = {
  ip_address: string | null;
  ip_hash: string | null;
  client_hash: string | null;
  request_id: string | null;
};

export default function SecurityIdentityDetails({ value }: { value: SecurityIdentity }) {
  return <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
    <p>IPアドレス: <code className="break-all">{value.ip_address ?? "未記録"}</code></p>
    <details className="mt-1">
      <summary className="cursor-pointer">IPハッシュ・投稿者識別情報</summary>
      <dl className="mt-2 space-y-1">
        <div><dt>IPハッシュ</dt><dd className="break-all font-mono">{value.ip_hash ?? "未記録"}</dd></div>
        <div><dt>ブラウザ識別子</dt><dd className="break-all font-mono">{value.client_hash ?? "未記録"}</dd></div>
        <div><dt>一括投稿ID</dt><dd className="break-all font-mono">{value.request_id ?? "未記録"}</dd></div>
      </dl>
    </details>
  </div>;
}
