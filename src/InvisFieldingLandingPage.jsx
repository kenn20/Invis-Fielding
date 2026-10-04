import React, { useEffect, useRef, useState } from 'react';

function Icon({ name = 'shield', className = 'h-5 w-5', ...props }) {
  const paths = {
    shield: <><path d="M12 3 20 6v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
    arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
    buffer: <><path d="M5 9a8 8 0 1 1-1 7M5 4v5H1" /><path d="M12 7v5l3 2" /></>,
    alert: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></>,
    folder: <><path d="M3 7V4h6l3 3h9v13H3V7Z" /><path d="m8 14 3 3 5-6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>{paths[name]}</svg>;
}

function Signup({ signupEndpoint }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const controller = useRef(null);
  const inFlight = useRef(false);
  const confirmation = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { if (status === 'confirmed') confirmation.current?.focus(); }, [status]);

  async function submit(event) {
    event.preventDefault();
    if (!signupEndpoint || inFlight.current) return;
    const normalized = email.trim().toLowerCase();
    if (normalized.length > 254 || !/^[a-z0-9][a-z0-9.!#$%&'*+/=?^_`{|}~-]*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(normalized)) {
      setStatus('error'); setError('Please enter a valid email address.'); return;
    }
    inFlight.current = true;
    setStatus('submitting'); setError('');
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 20000);
    try {
      const response = await fetch(signupEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized }), signal: controller.current.signal,
      });
      if (response.status === 429) {
        setStatus('error'); setError('Too many requests. Please wait a minute and try again.');
        return;
      }
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error('Signup failed');
      setStatus('confirmed');
    } catch {
      setStatus('error'); setError('We couldn’t confirm your signup. Please try again.');
    } finally { clearTimeout(timeout); inFlight.current = false; }
  }

  return <div id="early-access" className="relative scroll-mt-28 rounded-2xl border border-white/10 bg-slate-900/75 p-6 shadow-2xl shadow-black/20 sm:p-8">
    <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
    {status === 'confirmed' ? <div ref={confirmation} tabIndex={-1} className="rounded-xl py-4 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" role="status">
      <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400"><Icon name="check" className="h-6 w-6" /></span>
      <h2 className="text-2xl font-semibold text-white">You’re on the interest list.</h2>
      <p className="mt-3 leading-relaxed text-slate-300">We’ll email you when Invis-Fielding is available.</p>
      <p className="mt-6 text-sm text-slate-400">Thanks for helping shape what comes next.</p>
    </div> : <>
      <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-300"><span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> Be here from the beginning</div>
      <h2 className="text-2xl font-semibold tracking-tight text-white">A little more peace of mind.<br />A place to start.</h2>
      <p className="mt-3 text-sm leading-6 text-slate-400">Join the interest list for product availability updates. iPhone and Android first.</p>
      <form onSubmit={submit} className="mt-6" aria-busy={status === 'submitting'}>
        <label htmlFor="signup-email" className="mb-2 block text-sm font-medium text-slate-200">Email address</label>
        <input id="signup-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" disabled={status === 'submitting'} aria-invalid={status === 'error'} aria-describedby="signup-note signup-feedback" className="w-full rounded-lg border border-white/15 bg-slate-950/60 px-4 py-3.5 text-base text-white outline-none placeholder:text-slate-400 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/25 disabled:opacity-60" />
        <button type="submit" disabled={!signupEndpoint || status === 'submitting'} className="mt-3 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-amber-300 px-4 py-3 font-semibold text-slate-950 transition-colors hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-50">
          {status === 'submitting' ? 'Joining the list…' : 'Get early access updates'}<Icon name="arrow" />
        </button>
        <div id="signup-feedback" aria-live="polite" aria-atomic="true" className="mt-3 text-sm leading-5">
          {!signupEndpoint && <p className="text-amber-200">Registration isn’t connected yet. Please check back soon.</p>}
          {error && <p role="alert" className="text-rose-300">{error}</p>}
        </div>
        <p id="signup-note" className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-400"><Icon name="lock" className="mt-0.5 h-3.5 w-3.5 shrink-0" />By joining, you request availability updates. We collect your email only—please don’t submit incident details.</p>
      </form>
    </>}
  </div>;
}

function PhoneConcept() {
  return <figure className="relative mx-auto flex min-h-[440px] w-full pb-10 max-w-lg items-center justify-center" aria-label="Concept illustration of Invis-Fielding on a phone; not a working product">
    <div className="absolute h-80 w-80 rounded-full bg-emerald-400/5 blur-3xl" />
    <div className="absolute h-[340px] w-[340px] rounded-full border border-emerald-300/10 sm:h-[410px] sm:w-[410px]" />
    <div className="absolute h-64 w-64 rounded-full border border-white/5 sm:h-80 sm:w-80" />
    <div className="relative w-56 -rotate-6 rounded-[2.5rem] border border-slate-600 bg-gradient-to-br from-slate-700 to-slate-950 p-2.5 shadow-[0_30px_80px_rgba(0,0,0,0.6)] sm:w-64">
      <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-slate-950 px-5 pb-6 pt-3">
        <div className="mx-auto mb-7 h-4 w-20 rounded-full bg-black" />
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-400"><span>Invis-Fielding</span><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /></div>
        <div className="mx-auto mb-5 mt-8 flex h-24 w-24 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/5 shadow-[0_0_40px_rgba(52,211,153,0.08)]"><Icon className="h-12 w-12 text-emerald-300" /></div>
        <p className="text-center text-lg font-medium text-white">A shield within reach.</p>
        <p className="mt-2 text-center text-[10px] text-slate-400">Capture. Connect. Keep a record.</p>
        <div className="my-7 flex h-10 items-center justify-center gap-1" aria-hidden="true">{[8, 15, 10, 25, 18, 35, 26, 16, 30, 38, 21, 14, 26, 17, 10, 22, 12, 8].map((height, index) => <span key={index} style={{ height }} className="w-1 rounded-full bg-emerald-300/60" />)}</div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><div className="flex items-center gap-2 text-xs text-slate-200"><Icon name="alert" className="h-4 w-4 text-amber-300" />Trusted-contact alert</div><p className="mt-2 text-[10px] leading-4 text-slate-400">A planned way to reach someone you trust.</p></div>
        <div className="mt-4 rounded-lg bg-amber-300 py-3 text-center text-xs font-semibold text-slate-950">Preserve an incident</div>
      </div>
    </div>
    <div className="absolute right-0 top-20 flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/95 px-4 py-3 shadow-xl sm:right-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"><Icon name="folder" className="h-4 w-4" /></span><div><p className="text-xs font-medium text-white">Keep the context.</p><p className="mt-1 text-[10px] text-slate-400">Evidence organization, rethought.</p></div></div>
    <figcaption className="absolute bottom-0 text-[10px] uppercase tracking-[0.2em] text-slate-400">Concept illustration · Features in development</figcaption>
  </figure>;
}

const workflow = [
  { title: 'Prepare your safety circle', icon: 'shield', action: 'Simulate an incident', status: 'Ready for your journey', detail: 'Before heading out, you would choose a trusted contact and enable the permissions needed for capture and location sharing.', benefit: 'Decide who to reach before a stressful moment.', record: 'Trusted contact: Alex · Capture permissions enabled' },
  { title: 'Preserve the moment', icon: 'buffer', action: 'Preview contact alert', status: 'Incident captured · Simulation', detail: 'A user-triggered capture would preserve the incident and available rolling-buffer context, helping you keep the moments leading up to it.', benefit: 'Keep context that can be difficult to recall later.', record: 'Sample incident · 8:42 PM · Context attached' },
  { title: 'Reach someone you trust', icon: 'alert', action: 'Review the sample record', status: 'Alert preview · Not sent', detail: 'Your chosen contact would receive an alert with your location when permissions and connectivity allow. This demo sends no messages.', benefit: 'Give someone you trust context to check in with you.', record: 'To Alex: I need a check-in. My shared location is attached.' },
  { title: 'Organize your next step', icon: 'folder', action: 'Restart demo', status: 'Sample record ready for review', detail: 'Review captured context, timestamps, and your own notes in one place. Planned export tools would let you choose what to share with a professional.', benefit: 'Build a clearer record for a conversation or follow-up.', record: 'Sample record · Capture + timestamp + notes · Export preview' },
];

function WorkflowDemo() {
  const [step, setStep] = useState(0);
  const current = workflow[step];
  return <section id="workflow" aria-labelledby="workflow-heading" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-20 sm:px-8 lg:px-12">
    <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">How it would help protect you</p>
    <h2 id="workflow-heading" className="mt-4 text-3xl font-medium tracking-tight text-white sm:text-4xl">From an uncertain moment to a clearer next step.</h2>
    <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400">Try a sample evening journey. See how Invis-Fielding is being designed to help you preserve context, reach support, and keep a record.</p>
    <p className="mt-3 text-xs leading-6 text-amber-200">Interactive concept demo · Sample data only. No recording, location access, or alerts.</p>
    <div className="mt-9 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <ol className="grid gap-3" aria-label="Workflow steps">{workflow.map((item, index) => <li key={item.title}><button type="button" onClick={() => setStep(index)} aria-current={step === index ? 'step' : undefined} className={`flex min-h-16 w-full items-center gap-4 rounded-xl border p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 ${step === index ? 'border-emerald-300/50 bg-emerald-300/10 text-white' : 'border-white/10 bg-slate-900/40 text-slate-300 hover:bg-slate-800/50'}`}><span className="font-mono text-sm text-emerald-300">0{index + 1}</span><span className="text-sm font-medium">{item.title}</span><Icon name={item.icon} className="ml-auto h-5 w-5 shrink-0 text-emerald-300" /></button></li>)}</ol>
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
        <div aria-live="polite" aria-atomic="true">
          <p className="text-xs font-medium text-emerald-300">Step {step + 1} of 4 · {current.status}</p>
          <h3 className="mt-5 text-2xl font-medium text-white">{current.title}</h3>
          <p className="mt-4 text-sm leading-7 text-slate-300">{current.detail}</p>
          <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/70 p-4"><p className="text-[10px] uppercase tracking-widest text-slate-400">Demo preview</p><p className="mt-2 break-words text-sm leading-6 text-emerald-200">{current.record}</p></div>
          <p className="mt-5 text-sm leading-6 text-slate-300"><span className="font-medium text-white">Why it helps: </span>{current.benefit}</p>
        </div>
        <button type="button" onClick={() => setStep((step + 1) % workflow.length)} className="mt-6 flex min-h-12 items-center gap-3 rounded-lg bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300">{current.action}<Icon name="arrow" /></button>
      </div>
    </div>
    <p className="mt-6 max-w-3xl text-xs leading-6 text-slate-400">These capabilities are planned. Capture and alerts depend on device support, permissions, and connectivity. Alert delivery and a contact’s response are not guaranteed. Invis-Fielding cannot guarantee your safety or replace emergency services.</p>
  </section>;
}

const features = [
  { number: '01', icon: 'buffer', title: 'Keep the moments before.', description: 'Planned rolling buffering to help preserve context leading up to a user-triggered incident capture.', detail: 'Incident buffering' },
  { number: '02', icon: 'alert', title: 'Reach someone you trust.', description: 'A planned user-triggered alert to a chosen contact, with location where permissions and connectivity allow.', detail: 'Trusted-contact alerts' },
  { number: '03', icon: 'folder', title: 'Make your record clearer.', description: 'Planned tools to organize captured incidents and export records for review or sharing with a professional.', detail: 'Organized evidence exports' },
];

export default function InvisFieldingLandingPage({ signupEndpoint = '' }) {
  function scrollToSignup(event) {
    event.preventDefault();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('early-access')?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
    document.getElementById('signup-email')?.focus({ preventScroll: true });
  }
  return <div className="relative isolate min-h-screen overflow-x-clip bg-slate-950 font-sans text-slate-200">
    <a href="#main" className="sr-only fixed left-4 top-4 z-[60] rounded-lg bg-amber-300 px-4 py-3 text-slate-950 focus:not-sr-only">Skip to content</a>
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] bg-[radial-gradient(ellipse_at_75%_25%,rgba(16,185,129,0.08),transparent_45%),radial-gradient(ellipse_at_5%_35%,rgba(251,191,36,0.06),transparent_45%)]" />
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-slate-950/85 backdrop-blur-xl">
      <nav aria-label="Main navigation" className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <a href="#" aria-label="Invis-Fielding home" className="flex items-center gap-2.5 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"><Icon className="h-7 w-7 text-amber-300" /><span className="text-xs font-bold tracking-[0.08em] text-white">INVIS<span className="text-amber-300">-FIELDING</span></span></a>
        <span className="hidden text-xs text-slate-400 md:block">A little more agency. Wherever you go.</span>
        <a href="#early-access" onClick={scrollToSignup} className="flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white transition-colors hover:border-amber-300/60 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 sm:px-4">Get early access updates<Icon name="arrow" className="hidden h-4 w-4 sm:block" /></a>
      </nav>
    </header>
    <main id="main" tabIndex={-1} className="outline-none">
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-36 sm:px-8 sm:pt-40 lg:px-12 lg:pb-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3.5 py-2 text-[10px] font-medium tracking-wide text-emerald-200 sm:text-xs"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />In Development · iPhone &amp; Android First</div>
            <h1 className="max-w-2xl text-5xl font-semibold leading-[1.07] tracking-[-0.05em] text-white sm:text-6xl lg:text-[68px]">Your Shield,<br />on the Devices<br /><span className="text-amber-300">You Already Use.</span></h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">When a moment matters, you deserve a way to keep it. We’re developing Invis-Fielding to help you capture incidents, organize evidence, and alert someone you trust.</p>
            <a href="#workflow" className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-lg border border-emerald-300/30 bg-emerald-300/5 px-5 py-3 text-sm font-medium text-emerald-200 hover:bg-emerald-300/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300">Try the protection workflow<Icon name="arrow" /></a>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-slate-300"><span className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">iPhone</span><span className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">Android</span><span className="ml-1 text-slate-400">More hardware integrations planned</span></div>
          </div>
          <PhoneConcept />
        </div>
        <div className="mt-16 grid items-center gap-9 border-t border-white/10 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="max-w-lg"><p className="text-xs uppercase tracking-[0.2em] text-amber-300">For the next time you wish you had a record.</p><h2 className="mt-5 text-3xl font-medium leading-tight tracking-tight text-white sm:text-4xl">You shouldn’t have to<br />piece it all together later.</h2><p className="mt-5 leading-7 text-slate-400">A threat. A recurring incident. An interaction you need to document. Invis-Fielding is being designed to help you preserve context and take your next step with a clearer record.</p><div className="mt-6 flex items-center gap-2 text-sm text-emerald-300"><Icon name="check" className="h-4 w-4" />Your everyday devices. One connected vision.</div></div>
          <Signup signupEndpoint={signupEndpoint} />
        </div>
      </section>
      <WorkflowDemo />
      <section aria-labelledby="features-heading" className="border-y border-white/[0.07] bg-slate-900/25">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs uppercase tracking-[0.2em] text-emerald-300">The vision</p><h2 id="features-heading" className="mt-4 text-3xl font-medium tracking-tight text-white sm:text-4xl">Built around the moments that matter.</h2></div><span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-400">Planned capabilities</span></div>
          <div className="grid gap-5 md:grid-cols-3">{features.map(feature => <article key={feature.number} className="rounded-2xl border border-white/10 bg-slate-950/50 p-7"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-300/5 text-emerald-300"><Icon name={feature.icon} className="h-6 w-6" /></span><span className="font-mono text-xs text-slate-400">{feature.number}</span></div><p className="mb-3 mt-7 text-[10px] uppercase tracking-[0.15em] text-amber-200">{feature.detail}</p><h3 className="text-xl font-medium tracking-tight text-white">{feature.title}</h3><p className="mt-4 text-sm leading-7 text-slate-400">{feature.description}</p></article>)}</div>
          <p className="mt-7 max-w-3xl text-xs leading-6 text-slate-400">Capabilities are in development and may vary by device and operating system. Capture depends on device permissions and applicable recording rules. Alerts depend on connectivity and permissions; delivery and response are not guaranteed.</p>
        </div>
      </section>
      <section className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-16 sm:px-8 md:flex-row md:items-center lg:px-12"><div><p className="text-xs uppercase tracking-[0.2em] text-amber-300">Designed to grow with your world</p><h2 className="mt-4 text-2xl font-medium tracking-tight text-white sm:text-3xl">Phone first. A broader ecosystem next.</h2><p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">Starting with iPhone and Android. Our longer-term vision is a hardware-agnostic platform that connects more of the devices you already carry.</p></div><a href="#early-access" onClick={scrollToSignup} className="flex shrink-0 items-center gap-3 rounded-lg border border-amber-300/30 bg-amber-300/5 px-5 py-3.5 text-sm text-amber-200 hover:bg-amber-300/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300">Be part of what’s next<Icon name="arrow" className="h-4 w-4" /></a></section>
    </main>
    <footer className="border-t border-white/10"><div className="mx-auto max-w-7xl px-5 py-9 sm:px-8 lg:px-12"><div className="mb-5 flex items-center justify-between gap-4"><div className="flex items-center gap-2 text-xs font-semibold tracking-[0.15em] text-slate-300"><Icon className="h-5 w-5 text-amber-300" />INVIS-FIELDING</div><p className="text-xs text-slate-400">In development. Made for your everyday.</p></div><p className="max-w-4xl text-xs leading-6 text-slate-400">Invis-Fielding is a planned safety and evidence organization tool, not a law firm. It does not provide legal advice, guarantee admissibility or legal compliance, or replace emergency services. If you are in immediate danger, contact your local emergency services when safe to do so.</p></div></footer>
  </div>;
}
