# Attendance & Barcode Management System

A comprehensive web application for managing worker attendance and barcode/QR code tracking with Supabase integration.

## Features

- **Worker Management**: Add, update, and manage worker profiles
- **Attendance Tracking**: Mark attendance, track overtime, and generate reports
- **Barcode/QR Code Management**: Generate, scan, and track barcodes with status updates
- **Supabase Integration**: Real-time data synchronization with Supabase
- **Dashboard**: Visual analytics and reporting
- **Export Functionality**: CSV and Google Sheets export

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **State Management**: React Hooks, Context API
- **QR/Barcode**: html5-qrcode, jsbarcode, qrcode
- **Charts**: Recharts

## Prerequisites

- Node.js 18+ 
- pnpm 8+
- Supabase account and project

## Setup Instructions

### 1. Install Dependencies

```shell
pnpm install
```

### 2. Configure Supabase

1. Create a `.env` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

2. Set up your Supabase tables (see `SUPABASE_SETUP.md` for detailed instructions)

3. The application uses hardcoded Supabase credentials as fallback if environment variables are not set.

### 3. Run Development Server

```shell
pnpm run dev
```

### 4. Build for Production

```shell
pnpm run build
```

### 5. Preview Production Build

```shell
pnpm run preview
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/            # shadcn/ui components
│   ├── auth/          # Authentication components
│   ├── dashboard/     # Dashboard components
│   └── ...
├── lib/               # Utility functions and services
│   ├── supabase-*.ts  # Supabase integration files
│   ├── attendance-utils.ts
│   └── ...
├── contexts/          # React contexts
├── hooks/             # Custom React hooks
├── pages/             # Page components
└── types.ts           # TypeScript type definitions
```

## Key Features

### Attendance Management
- Track worker attendance (present, absent, half-day)
- Overtime tracking
- Date-based filtering
- CSV export for reports

### Barcode Management
- Generate QR codes and barcodes
- Scan barcodes using camera
- Track barcode status (pending, packed, shipped)
- Bulk operations
- Assign barcodes to workers

### Data Sync
- Automatic sync to Supabase
- Local storage fallback
- Real-time updates

## Environment Variables

Create a `.env` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Note**: The application includes hardcoded Supabase credentials as fallback for development.

## License

MIT

## Support

For issues and questions, please refer to the documentation in `SUPABASE_SETUP.md` or check the Supabase dashboard for database setup.
