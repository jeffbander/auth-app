# Auth App

A Next.js 14 application with Clerk authentication and Convex database integration.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Clerk
- **Database**: Convex

## Prerequisites

- Node.js 18+
- npm or yarn
- Clerk account ([sign up](https://clerk.com))
- Convex account ([sign up](https://convex.dev))

## Setup Instructions

### 1. Install Dependencies

```bash
cd auth-app
npm install
```

### 2. Configure Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Copy your API keys

### 3. Configure Convex

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Create a new project
3. Copy your deployment URL

### 4. Set Up Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your credentials:

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

This will prompt you to log in and set up your Convex project.

### 7. Run the Development Server

In one terminal:
```bash
npx convex dev
```

In another terminal:
```bash
npm run dev:next
```

Or run both together:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
auth-app/
├── app/
│   ├── (auth)/              # Auth routes (sign-in, sign-up)
│   ├── (main)/              # Protected routes
│   │   └── dashboard/       # Dashboard page
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout with providers
│   └── page.tsx             # Landing page
├── components/
│   └── providers.tsx        # Clerk + Convex providers
├── convex/
│   ├── auth.config.ts       # Clerk auth configuration
│   └── schema.ts            # Database schema
├── lib/
│   └── utils.ts             # Utility functions
└── middleware.ts            # Route protection
```

## Available Scripts

- `npm run dev` - Start both Next.js and Convex in development mode
- `npm run dev:next` - Start only Next.js development server
- `npm run dev:convex` - Start only Convex development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy Convex: `npx convex deploy`

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Convex Documentation](https://docs.convex.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
