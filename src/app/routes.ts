export type IconKey =
  | 'logo'
  | 'sliders'
  | 'gauge'
  | 'waveform'
  | 'compass'
  | 'package'
  | 'terminal'
  | 'plug'
  | 'shield'
  | 'play'
  | 'menu'
  | 'close'
  | 'sun'
  | 'moon'
  | 'download'
  | 'upload'
  | 'reset'
  | 'trash'
  | 'save'
  | 'swap'
  | 'check'
  | 'alert';

export type NavId =
  | 'rate-studio'
  | 'rate-calibration'
  | 'blackbox-lab'
  | 'tune-coach'
  | 'drone-garage'
  | 'betaflight-tools'
  | 'hardware-connect'
  | 'safety-center'
  | 'demo-mode';

export interface NavItem {
  readonly id: NavId;
  readonly path: string;
  readonly labelKey: string;
  readonly status: 'ready' | 'planned';
  readonly icon: IconKey;
  /**
   * i18n prefix of the module's own copy (title, description, bullet points).
   * Present on planned modules: their `id` mirrors the kebab-case path, which
   * is not the shape the message catalogue uses.
   */
  readonly contentKey?: string;
}

/** A planned module always carries the copy prefix its page renders. */
export type PlannedNavItem = NavItem & { readonly contentKey: string };

/** The nine modules announced for OpenRotor Lab; only one is implemented today. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'rate-studio',
    path: '/rate-studio',
    labelKey: 'nav.rateStudio',
    status: 'ready',
    icon: 'sliders',
  },
  {
    id: 'rate-calibration',
    path: '/rate-calibration',
    labelKey: 'nav.rateCalibration',
    status: 'planned',
    icon: 'gauge',
    contentKey: 'planned.rateCalibration',
  },
  {
    id: 'blackbox-lab',
    path: '/blackbox-lab',
    labelKey: 'nav.blackboxLab',
    status: 'planned',
    icon: 'waveform',
    contentKey: 'planned.blackboxLab',
  },
  {
    id: 'tune-coach',
    path: '/tune-coach',
    labelKey: 'nav.tuneCoach',
    status: 'planned',
    icon: 'compass',
    contentKey: 'planned.tuneCoach',
  },
  {
    id: 'drone-garage',
    path: '/drone-garage',
    labelKey: 'nav.droneGarage',
    status: 'planned',
    icon: 'package',
    contentKey: 'planned.droneGarage',
  },
  {
    id: 'betaflight-tools',
    path: '/betaflight-tools',
    labelKey: 'nav.betaflightTools',
    status: 'planned',
    icon: 'terminal',
    contentKey: 'planned.betaflightTools',
  },
  {
    id: 'hardware-connect',
    path: '/hardware-connect',
    labelKey: 'nav.hardwareConnect',
    status: 'planned',
    icon: 'plug',
    contentKey: 'planned.hardwareConnect',
  },
  {
    id: 'safety-center',
    path: '/safety-center',
    labelKey: 'nav.safetyCenter',
    status: 'planned',
    icon: 'shield',
    contentKey: 'planned.safetyCenter',
  },
  {
    id: 'demo-mode',
    path: '/demo-mode',
    labelKey: 'nav.demoMode',
    status: 'planned',
    icon: 'play',
    contentKey: 'planned.demoMode',
  },
];

export const READY_NAV_ITEMS: readonly NavItem[] = NAV_ITEMS.filter(
  (item) => item.status === 'ready',
);

export const PLANNED_NAV_ITEMS: readonly PlannedNavItem[] = NAV_ITEMS.filter(
  (item): item is PlannedNavItem => item.status === 'planned' && item.contentKey !== undefined,
);

export const HOME_REDIRECT = '/rate-studio';
