# Auth App - Echocardiogram Qualification System

A professional web application for processing patient clinical notes to identify echocardiogram qualification criteria for insurance authorization.

## Features

- **Intelligent NLP Analysis**: Automatically detect cardiac symptoms, history, and findings from clinical notes
- **Specialist Hierarchy**: Prioritize findings based on specialist credibility (Cardiology > ED > Internal Medicine > PCP)
- **Conflict Resolution**: Automatically resolve conflicting information based on source priority and date
- **Export Functionality**: Generate CSV and Excel reports with clinical citations
- **Authorization Letters**: Print-ready insurance authorization letter templates
- **HIPAA Compliance**: Data anonymization options and secure processing

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Clerk
- **Database**: Convex
- **Icons**: Heroicons
- **Export**: xlsx library

## Clinical Terms Detected

### Cardiac Symptoms
- Chest pain, dyspnea, palpitations, syncope
- Orthopnea, paroxysmal nocturnal dyspnea
- Edema, exercise intolerance

### Cardiac History
- Myocardial infarction, heart failure
- Atrial fibrillation, valvular disease
- Cardiomyopathy, coronary artery disease
- Prior cardiac surgery, murmurs

### Cardiac Findings
- Abnormal EKG, elevated cardiac biomarkers
- Cardiomegaly, JVD, gallops, rales

### Risk Factors
- Hypertension, diabetes, hyperlipidemia
- Family history, smoking

## Setup Instructions

### 1. Install Dependencies

```bash
cd auth-app
npm install
```

### 2. Configure Clerk Authentication

1. Create an account at [Clerk](https://clerk.com)
2. Create a new application
3. Copy your API keys from the Clerk Dashboard

### 3. Configure Convex Database

1. Create an account at [Convex](https://convex.dev)
2. Create a new project
3. Copy your deployment URL

### 4. Set Up Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CLERK_JWT_ISSUER_DOMAIN=https://xxxxx.clerk.accounts.dev
```

### 5. Configure Clerk JWT for Convex

1. In Clerk Dashboard, go to **JWT Templates**
2. Create a new template named `convex`
3. Use this template:

```json
{
  "aud": "convex",
  "iat": "{{time.now}}",
  "exp": "{{time.now.plus.1.hour}}",
  "iss": "{{env.CLERK_JWT_ISSUER_DOMAIN}}",
  "sub": "{{user.id}}"
}
```

### 6. Initialize Convex

```bash
npx convex dev
```

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
auth-app/
├── app/
│   ├── (auth)/                    # Authentication routes
│   │   ├── sign-in/               # Sign in page
│   │   └── sign-up/               # Sign up page
│   ├── (main)/
│   │   └── dashboard/             # Main application
│   │       ├── analyze/           # New analysis form
│   │       ├── history/           # Analysis history
│   │       ├── reports/           # Export reports
│   │       ├── settings/          # User settings
│   │       └── analysis/[id]/     # Analysis detail
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                   # Landing page
├── components/
│   ├── ui/                        # Reusable UI components
│   │   ├── button.tsx
│   │   ├── data-table.tsx
│   │   ├── header.tsx
│   │   ├── loading.tsx
│   │   ├── sidebar.tsx
│   │   ├── stat-card.tsx
│   │   └── status-badge.tsx
│   └── providers.tsx              # Clerk + Convex providers
├── convex/
│   ├── analyses.ts                # Analysis CRUD operations
│   ├── auth.config.ts             # Clerk integration
│   ├── schema.ts                  # Database schema
│   └── settings.ts                # User settings
├── lib/
│   ├── clinical-terms.ts          # Clinical terminology database
│   ├── export-utils.ts            # CSV/Excel export
│   ├── nlp-processor.ts           # Clinical note analysis
│   ├── specialist-hierarchy.ts    # Specialist prioritization
│   └── utils.ts                   # Utility functions
└── middleware.ts                  # Route protection
```

## Usage

### Analyzing Clinical Notes

1. Navigate to **New Analysis**
2. Enter patient information (name, MRN, insurance)
3. Paste clinical notes from various sources
4. Click **Analyze Notes**
5. Review findings and qualification status
6. Save analysis for future reference

### Exporting Data

1. Go to **History** or **Reports**
2. Select date range and filters
3. Choose export format (CSV or Excel)
4. Optionally enable anonymization

### Authorization Letters

1. Open an analysis detail page
2. Click **Print Letter** or **Download Letter**
3. Use generated letter for insurance authorization

## Specialist Credibility Hierarchy

| Priority | Weight | Specialists |
|----------|--------|-------------|
| High | 10 | Cardiologist, Interventional Cardiologist, Electrophysiologist, Cardiac Surgeon |
| Medium-High | 8 | Emergency Department, Hospitalist, Intensivist, Pulmonologist, Internal Medicine |
| Medium | 5 | Primary Care Physician, Family Medicine |
| Low | 2 | Other specialists, routine follow-ups |

## Qualification Logic

A patient **qualifies** for echocardiogram if:
- Any cardiac history (MI, CHF, valve disease, etc.)
- Any cardiac findings (abnormal EKG, elevated troponin, etc.)
- 2+ cardiac symptoms
- 1 cardiac symptom from high-priority source
- 3+ risk factors combined with any symptom

## HIPAA Compliance

- All text analysis occurs locally in the browser
- Database storage is encrypted and access-controlled
- Exports can be anonymized to remove PHI
- Configurable data retention policies

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both Next.js and Convex in development |
| `npm run dev:next` | Start only Next.js |
| `npm run dev:convex` | Start only Convex |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Convex Documentation](https://docs.convex.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
