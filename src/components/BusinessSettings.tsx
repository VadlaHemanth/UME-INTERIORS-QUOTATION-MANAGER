import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Eye, EyeOff } from 'lucide-react';
import { CompanySettings, validateCompanySettings } from '../lib/company-settings';
import './BusinessSettings.css';

type Section = 'business' | 'payments' | 'account';
export type CredentialUpdate = { currentPassword: string; newUsername: string; newPassword: string };
type Props = {
  company: CompanySettings;
  ownerUsername: string;
  initialSection?: Section;
  onSaveCompany: (company: CompanySettings) => Promise<CompanySettings>;
  onSaveCredentials: (values: CredentialUpdate) => Promise<void>;
  onClose: () => void;
};

export function BusinessSettings({ company, ownerUsername, initialSection = 'business', onSaveCompany, onSaveCredentials, onClose }: Props) {
  const [section, setSection] = useState<Section>(initialSection);
  const [draft, setDraft] = useState(() => structuredClone(company));
  const [saved, setSaved] = useState(() => structuredClone(company));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [companyBusy, setCompanyBusy] = useState(false);
  const [companyMessage, setCompanyMessage] = useState('');
  const [companyError, setCompanyError] = useState('');
  const [username, setUsername] = useState(ownerUsername);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMessage, setAccountMessage] = useState('');
  const [accountError, setAccountError] = useState('');
  const [leavePrompt, setLeavePrompt] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const accountDirty = username !== ownerUsername || Boolean(currentPassword || newPassword || confirmPassword);
  const busy = companyBusy || accountBusy;

  useEffect(() => { headingRef.current?.focus(); }, []);
  useEffect(() => {
    if (dirty || companyBusy) return;
    setDraft(structuredClone(company));
    setSaved(structuredClone(company));
  }, [company]);
  useEffect(() => {
    if (!dirty && !accountDirty) { setLeavePrompt(false); return; }
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, accountDirty]);

  const update = (key: string, value: string | number) => {
    setDraft(previous => key.startsWith('bank.')
      ? { ...previous, bank: { ...previous.bank, [key.slice(5)]: value } }
      : { ...previous, [key]: value });
    setErrors(previous => { const next = { ...previous }; delete next[key]; return next; });
    setCompanyMessage(''); setCompanyError(''); setLeavePrompt(false);
  };
  const discard = () => {
    setDraft(structuredClone(saved)); setErrors({}); setCompanyError('');
    setCompanyMessage('Changes discarded. Your saved details are shown.');
  };
  const requestClose = () => {
    if (busy) return;
    if (dirty || accountDirty) setLeavePrompt(true);
    else onClose();
  };
  const saveCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = validateCompanySettings(draft);
    setCompanyMessage(''); setCompanyError(''); setErrors(result.errors);
    if (!result.valid || !result.company) {
      const first = Object.keys(result.errors)[0];
      setSection(first?.startsWith('bank.') ? 'payments' : 'business');
      setCompanyError('Check the highlighted details, then save again.');
      requestAnimationFrame(() => document.getElementById(`company-${first}`)?.focus());
      return;
    }
    setCompanyBusy(true);
    try {
      const next = await onSaveCompany(result.company);
      setSaved(structuredClone(next)); setDraft(structuredClone(next));
      setCompanyMessage('Business and payment details saved. Customer quotations and payment QR codes now use these details.');
    } catch (error) {
      const fieldErrors = (error as { fieldErrors?: Record<string, string> })?.fieldErrors;
      if (fieldErrors) setErrors(fieldErrors);
      setCompanyError(error instanceof Error ? error.message : 'Could not save your details. Please try again.');
    } finally { setCompanyBusy(false); }
  };
  const saveAccount = async (event: React.FormEvent) => {
    event.preventDefault(); setAccountMessage(''); setAccountError('');
    if (newPassword !== confirmPassword) { setAccountError('The new passwords do not match. Enter them again.'); return; }
    setAccountBusy(true);
    try {
      await onSaveCredentials({ currentPassword, newUsername: username.trim(), newPassword });
      setUsername(username.trim()); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setAccountMessage('Your sign-in details have been updated.');
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Could not update sign-in details. Please try again.');
    } finally { setAccountBusy(false); }
  };
  const field = (key: string, label: string, options: { optional?: boolean; hint?: string; type?: string; autoComplete?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; wide?: boolean } = {}) => {
    const value = key.startsWith('bank.') ? draft.bank[key.slice(5) as keyof CompanySettings['bank']] : draft[key as keyof Omit<CompanySettings, 'bank'>];
    const error = errors[key];
    const hintId = options.hint ? `company-${key}-hint` : undefined;
    const errorId = error ? `company-${key}-error` : undefined;
    return <div className={`business-field${options.wide ? ' business-field-wide' : ''}`} key={key}>
      <label htmlFor={`company-${key}`}>{label}{options.optional && <span>Optional</span>}</label>
      <input id={`company-${key}`} name={key} value={Number.isNaN(value) ? '' : value} type={options.type || 'text'} inputMode={options.inputMode} autoComplete={options.autoComplete || 'off'} required={!options.optional} min={options.type === 'number' ? 1 : undefined} step={options.type === 'number' ? 1 : undefined} aria-invalid={Boolean(error)} aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined} disabled={companyBusy} onChange={event => update(key, options.type === 'number' ? (event.target.value === '' ? Number.NaN : Number(event.target.value)) : event.target.value)}/>
      {options.hint && <p id={hintId} className="business-field-hint">{options.hint}</p>}
      {error && <p id={errorId} className="business-field-error">{error}</p>}
    </div>;
  };

  return <section className="business-settings no-print" aria-labelledby="business-settings-title">
    <header className="business-settings-heading">
      <button type="button" className="settings-back" onClick={requestClose} disabled={busy}><ArrowLeft size={18}/> Back to studio</button>
      <h1 id="business-settings-title" tabIndex={-1} ref={headingRef}>Settings</h1>
      <p>Manage the details your customers see and your studio sign-in.</p>
    </header>
    {leavePrompt && <div className="settings-leave-prompt" role="alert">
      <div><strong>You have unsaved changes.</strong><p>Save your details or discard them before leaving.</p></div>
      <div><button type="button" onClick={() => setLeavePrompt(false)}>Keep editing</button><button type="button" onClick={onClose}>Discard and leave</button></div>
    </div>}
    <div className="business-settings-layout">
      <nav className="business-settings-nav" aria-label="Settings sections">
        <button type="button" aria-current={section === 'business' ? 'page' : undefined} onClick={() => setSection('business')}>Business</button>
        <button type="button" aria-current={section === 'payments' ? 'page' : undefined} onClick={() => setSection('payments')}>Payment details</button>
        <button type="button" aria-current={section === 'account' ? 'page' : undefined} onClick={() => setSection('account')}>Account</button>
        <p>Business and payment details appear on customer quotations.</p>
      </nav>
      <div className="business-settings-panel">
        {section !== 'account' ? <form onSubmit={saveCompany} noValidate>
          <div className="business-section-heading"><h2>{section === 'business' ? 'Business details' : 'Payment details'}</h2><p>{section === 'business' ? 'Your business identity, address and customer contact details.' : 'The account and UPI ID customers use to pay for their project.'}</p></div>
          {section === 'business' ? <div className="business-fields">
            {field('brandName', 'Display business name', { autoComplete: 'organization', wide: true })}
            {field('legalName', 'Legal business name', { wide: true })}
            {field('subtitle', 'Business description', { optional: true, wide: true })}
            {field('proprietor', 'Proprietor')}
            {field('domain', 'Website', { optional: true, autoComplete: 'url', inputMode: 'url', hint: 'A domain or full website address.' })}
            {field('phone', 'Contact number', { autoComplete: 'tel', type: 'tel', hint: 'Include your country code, for example +91.' })}
            {field('whatsapp', 'WhatsApp number', { type: 'tel', hint: 'Include the country code, for example 919491661555 (91 for India).' })}
            <div className="business-field business-field-wide"><label htmlFor="company-address">Business address</label><textarea id="company-address" name="address" autoComplete="street-address" rows={3} value={draft.address} disabled={companyBusy} onChange={event => update('address', event.target.value)} aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? 'company-address-error' : undefined} required/>{errors.address && <p id="company-address-error" className="business-field-error">{errors.address}</p>}</div>
          </div> : <>
            <div className="business-fields">
              {field('bank.bankName', 'Bank name')}
              {field('bank.branch', 'Branch', { optional: true })}
              {field('bank.accountName', 'Account holder name', { wide: true })}
              {field('bank.accountNumber', 'Account number', { inputMode: 'text', hint: 'Enter it exactly as shown by your bank.' })}
              {field('bank.ifsc', 'IFSC', { hint: '11 characters, for example SBIN0065453.' })}
              {field('bank.upiId', 'UPI ID', { hint: 'Every payment QR code is generated from this UPI ID.', wide: true })}
              {field('bank.upiLimitRupees', 'UPI payment limit (₹)', { type: 'number', inputMode: 'numeric', hint: 'Use the transaction limit applicable to your account.' })}
            </div>
            <p className="business-payment-note">Check the account number and UPI ID with your bank before saving. These format checks do not verify the account or its owner.</p>
          </>}
          <div className="business-save-area">
            {companyError && <p className="settings-status settings-status-error" role="alert">{companyError}</p>}
            {companyMessage && <p className="settings-status settings-status-success" role="status"><Check size={17}/>{companyMessage}</p>}
            <div className="business-save-actions"><span>{dirty ? 'Unsaved changes' : 'All details saved'}</span><div><button type="button" className="settings-cancel" disabled={!dirty || companyBusy} onClick={discard}>Discard changes</button><button className="settings-save" type="submit" disabled={!dirty || companyBusy}>{companyBusy ? 'Saving…' : 'Save details'}</button></div></div>
          </div>
        </form> : <form onSubmit={saveAccount}>
          <div className="business-section-heading"><h2>Account</h2><p>Change your owner username and password. Your current password is required.</p></div>
          <div className="business-fields business-account-fields">
            <div className="business-field business-field-wide"><label htmlFor="settings-username">Username</label><input id="settings-username" name="newUsername" value={username} onChange={event => { setUsername(event.target.value); setAccountMessage(''); }} autoComplete="username" minLength={3} maxLength={64} required disabled={accountBusy}/></div>
            <div className="business-field business-field-wide"><label htmlFor="settings-current-password">Current password</label><input id="settings-current-password" name="currentPassword" type={passwordVisible ? 'text' : 'password'} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" required disabled={accountBusy}/></div>
            <div className="business-field business-field-wide"><label htmlFor="settings-new-password">New password</label><input id="settings-new-password" name="newPassword" type={passwordVisible ? 'text' : 'password'} value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" minLength={12} aria-describedby="settings-password-hint" required disabled={accountBusy}/><p id="settings-password-hint" className="business-field-hint">Use at least 12 characters.</p></div>
            <div className="business-field business-field-wide"><label htmlFor="settings-confirm-password">Confirm new password</label><input id="settings-confirm-password" name="confirmPassword" type={passwordVisible ? 'text' : 'password'} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={12} required disabled={accountBusy}/></div>
            <button className="settings-show-password" type="button" aria-pressed={passwordVisible} onClick={() => setPasswordVisible(!passwordVisible)}>{passwordVisible ? <EyeOff size={17}/> : <Eye size={17}/>} {passwordVisible ? 'Hide passwords' : 'Show passwords'}</button>
          </div>
          <div className="business-save-area">
            {accountError && <p className="settings-status settings-status-error" role="alert">{accountError}</p>}
            {accountMessage && <p className="settings-status settings-status-success" role="status"><Check size={17}/>{accountMessage}</p>}
            <div className="business-save-actions"><span>{accountDirty ? 'Unsaved account changes' : 'Owner sign-in'}</span><div><button type="button" className="settings-cancel" disabled={!accountDirty || accountBusy} onClick={() => { setUsername(ownerUsername); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setAccountError(''); setAccountMessage(''); }}>Cancel changes</button><button type="submit" className="settings-save" disabled={accountBusy}>{accountBusy ? 'Updating…' : 'Save sign-in details'}</button></div></div>
          </div>
        </form>}
      </div>
    </div>
  </section>;
}
