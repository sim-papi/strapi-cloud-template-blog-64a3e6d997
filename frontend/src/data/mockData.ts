import { MachineStats, ErrorSummary, ErrorDetail } from '../types';

export const machineStats: MachineStats[] = [
  { id: 'thermoformer', name: 'Thermoformer', icon: 'precision_manufacturing', totalErrors: 412, coverage: 96, missingCauses: 16 },
  { id: 'traysealer', name: 'Traysealer', icon: 'settings_input_component', totalErrors: 284, coverage: 92, missingCauses: 23 },
  { id: 'h-module', name: 'H-Module', icon: 'grid_view', totalErrors: 156, coverage: 78, missingCauses: 34 },
  { id: 'labeller', name: 'Labeller', icon: 'label', totalErrors: 102, coverage: 100, missingCauses: 0 },
  { id: 'flowpacker', name: 'Flowpacker', icon: 'conveyor_belt', totalErrors: 198, coverage: 85, missingCauses: 30 },
  { id: 'slicer', name: 'Slicer', icon: 'restaurant', totalErrors: 132, coverage: 98, missingCauses: 3 },
  { id: 'portionierer', name: 'Portionierer', icon: 'splitscreen', totalErrors: 90, coverage: 81, missingCauses: 17 },
];

export const thermoformerErrors: ErrorSummary[] = [
  { id: '1', code: 'TF-ERR-0941', description: 'Vacuum Pump Overload', shortDescription: 'Current draw exceeded 4.2A safety threshold in forming zone.', solutionsCount: 8 },
  { id: '2', code: 'TF-ERR-1102', description: 'Pre-heating Plate Desync', shortDescription: 'Timing delay in pneumatic cylinder retraction (>150ms).', solutionsCount: 12 },
  { id: '3', code: 'TF-ERR-0052', description: 'Film Edge Alignment Warning', shortDescription: 'Optical sensor detected >2mm lateral shift in bottom film.', solutionsCount: 4 },
  { id: '4', code: 'TF-ERR-4211', description: 'Cross-cutting Blade Torque', shortDescription: 'High resistance detected during discharge stroke. Inspect blades.', solutionsCount: 6 },
  { id: '5', code: 'TF-ERR-0877', description: 'Gas Flush Valve Fault', shortDescription: 'Inconsistent N2/CO2 mixing ratio in sealing station.', solutionsCount: 3 },
];

export const errorDetail: ErrorDetail = {
  id: '1',
  code: 'TF-ERR-0941',
  title: 'Vacuum Pump Overload',
  machineType: 'Thermoformer',
  conditions: [
    'High speed production mode active',
    'Ambient temperature above 35°C'
  ],
  occurrenceType: 'Sporadic',
  connectedLogic: [
    { code: 'TF-ERR-0822', description: 'Possible cascading power failure due to shared breaker in cabinet R2.', type: 'error' },
    { code: 'VC-SEN-0012', description: 'Sensor calibration drift might trigger false overload warnings.', type: 'sensor' }
  ],
  causes: [
    {
      id: 'c1',
      rank: '01',
      probability: 'High',
      estTime: 45,
      designation: 'Oil Contamination / Filter Blockage',
      indicators: [
        'Oil color shifts to dark brown or black',
        'Excessive exhaust smoke during cycle'
      ],
      exclusionRules: [
        'Fresh oil service performed in last 100 hrs'
      ],
      steps: [
        'Drain residual oil into a dedicated chemical waste container.',
        'Inspect exhaust filter for metallic debris or particle buildup.'
      ]
    },
    {
      id: 'c2',
      rank: '02',
      probability: 'Medium',
      estTime: 15,
      designation: 'Frequency Inverter Overheating',
      indicators: [
        'Visual verification of cabinet fan RPM'
      ],
      exclusionRules: [
        'External cooling unit active'
      ],
      steps: [
        'Clean dust filters on R2 electrical cabinet intake.'
      ]
    }
  ],
  safetyProtocols: {
    prohibited: [
      'Do NOT attempt manual override of vacuum safety interlocks.',
      'Do NOT open the pump enclosure while cooling cycle is active.'
    ],
    escalation: [
      'Contact Plant Manager if motor current exceeds 25A for > 5 mins.',
      'Escalate to Regional Service if R2 cabinet fan replacement fails to resolve temperature.'
    ]
  },
  peerIntelligence: [
    {
      author: 'Anders Knudsen',
      role: 'Field Tech Level 3',
      date: '14 OCT 2024',
      initials: 'AK',
      content: 'Seen this on the R-series machines frequently. Usually, the internal temperature sensor fails before the pump actually overloads. Check telemetry point V_TEMP_04 before hardware swap.'
    }
  ]
};
