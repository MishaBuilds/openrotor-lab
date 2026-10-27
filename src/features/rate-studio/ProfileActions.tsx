import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../app/icons';
import { useRateStudio } from '../../store/rateStudioStore';

/** Turns a profile name into a safe download stem, always non-empty. */
function safeFilePrefix(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.length > 0 ? cleaned : 'openrotor-profile';
}

/**
 * Profile name plus JSON export and import. Import is validated by the core
 * before anything in the workspace changes.
 */
export function ProfileActions() {
  const { t } = useTranslation();
  const profileName = useRateStudio((state) => state.profileName);
  const setProfileName = useRateStudio((state) => state.setProfileName);
  const exportProfileJson = useRateStudio((state) => state.exportProfileJson);
  const importProfileJson = useRateStudio((state) => state.importProfileJson);
  const notify = useRateStudio((state) => state.notify);
  const importIssues = useRateStudio((state) => state.importIssues);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = () => {
    const text = exportProfileJson();
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${safeFilePrefix(profileName)}.json`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      importProfileJson(String(reader.result ?? ''));
      input.value = '';
    };
    reader.onerror = () => {
      notify({ tone: 'error', messageKey: 'notice.file.unreadable' });
      input.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">{t('rate.export.title')}</h2>
      </div>

      <div className="field" style={{ marginBottom: 'var(--space-3)' }}>
        <label className="field__label" htmlFor="profile-name">
          {t('rate.profileName')}
        </label>
        <input
          id="profile-name"
          className="input"
          type="text"
          maxLength={60}
          value={profileName}
          onChange={(event) => setProfileName(event.target.value)}
        />
        <span className="faint text-xs">{t('rate.profileNameHint')}</span>
      </div>

      <div className="row">
        <button type="button" className="btn" onClick={handleExport}>
          <Icon name="download" />
          {t('rate.export.button')}
        </button>
        <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
          <Icon name="upload" />
          {t('rate.import.button')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          aria-label={t('rate.import.button')}
          onChange={handleFileSelected}
        />
      </div>

      <p className="faint" style={{ marginTop: 'var(--space-3)' }}>
        {t('rate.export.hint')}
      </p>
      <p className="faint">{t('rate.import.hint')}</p>

      {importIssues && importIssues.length > 0 ? (
        <div className="notice notice--error" style={{ marginTop: 'var(--space-3)' }}>
          <Icon name="alert" />
          <div className="notice__body">
            <strong className="text-sm">{t('rate.import.issues')}</strong>
            <ul className="issue-list">
              {importIssues.map((issue) => (
                <li key={`${issue.path}:${issue.code}`}>
                  <code>{issue.path}</code> — {issue.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
