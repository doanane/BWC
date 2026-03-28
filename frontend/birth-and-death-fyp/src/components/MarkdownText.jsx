function renderInline(str, baseKey) {
  const parts = [];
  let remaining = str;
  let k = 0;
  while (remaining.length > 0) {
    const boldStart = remaining.indexOf('**');
    if (boldStart !== -1) {
      const boldEnd = remaining.indexOf('**', boldStart + 2);
      if (boldEnd !== -1) {
        if (boldStart > 0) parts.push(<span key={`${baseKey}-t${k++}`}>{remaining.slice(0, boldStart)}</span>);
        parts.push(<strong key={`${baseKey}-b${k++}`}>{remaining.slice(boldStart + 2, boldEnd)}</strong>);
        remaining = remaining.slice(boldEnd + 2);
        continue;
      }
    }
    parts.push(<span key={`${baseKey}-r${k++}`}>{remaining}</span>);
    break;
  }
  return parts;
}

export default function MarkdownText({ text, style }) {
  if (!text) return null;

  const lines = text.split('\n');
  const result = [];
  let bullets = [];
  let bk = 0;

  function flush() {
    if (bullets.length === 0) return;
    result.push(
      <ul key={`ul${bk++}`} style={{ margin: '4px 0 10px 18px', padding: 0, listStyle: 'disc' }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ marginBottom: 4, lineHeight: 1.65 }}>{renderInline(b, `li${bk}${i}`)}</li>
        ))}
      </ul>
    );
    bullets = [];
  }

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (/^-{2,}$|^\*{2,}$|^_{2,}$/.test(trimmed)) {
      flush();
      return;
    }

    if (/^#{1,3} /.test(trimmed)) {
      flush();
      const content = trimmed.replace(/^#+\s/, '');
      result.push(
        <p key={i} style={{ fontWeight: 700, margin: '12px 0 4px', fontSize: '0.92em' }}>
          {renderInline(content, `h${i}`)}
        </p>
      );
      return;
    }

    if (/^[-*•]\s/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[-*•]\s/, ''));
      return;
    }

    flush();

    if (!trimmed) return;

    result.push(
      <p key={i} style={{ margin: '0 0 7px', lineHeight: 1.7 }}>
        {renderInline(trimmed, `p${i}`)}
      </p>
    );
  });

  flush();

  return (
    <div style={{ fontSize: '0.88rem', color: 'inherit', ...style }}>
      {result}
    </div>
  );
}
