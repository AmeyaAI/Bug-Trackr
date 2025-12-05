# BugTrackr Deployment Guide (Client-Side SPA)

This application has been refactored to be a fully client-side Single Page Application (SPA). It is designed to be compiled into static HTML/CSS/JS files and hosted on any static file hosting service (AWS S3, Vercel, Netlify, GitHub Pages, etc.).

**Key Changes:**
*   **No Server-Side Code**: The Next.js API routes (`/pages/api`) have been removed.
*   **Direct Data Access**: The application connects directly to the AppFlyte Collection DB from the browser using the Service/Repository pattern.
*   **Static Export**: The build process generates a static `out/` directory.

## Prerequisites

*   Node.js 18+ installed.
*   AppFlyte Collection Database account with API credentials.

## Environment Configuration

Since the application runs entirely in the browser, all environment variables must be prefixed with `NEXT_PUBLIC_` to be exposed to the client-side code.

Create a `.env.local` file (or configure your build environment) with the following:

```bash
NEXT_PUBLIC_APPFLYTE_COLLECTION_BASE_URL=https://appflyte-backend.ameya.ai/[workspace-id]/api/collection/[workspace-id]/user/public/cm/0/dpdo_bug_tracker
NEXT_PUBLIC_APPFLYTE_COLLECTION_API_KEY=your_api_key_here
```

**Security Note**: Your AppFlyte API Key will be visible in the client-side code. Ensure your AppFlyte Collection DB has appropriate security rules (CORS, origin restrictions) to prevent unauthorized access if necessary.

## Build Process

To build the application for production:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Build**:
    ```bash
    npm run build
    ```

    This command will:
    *   Compile the TypeScript code.
    *   Optimize the application.
    *   Export the static files to the `out/` directory (configured via `output: 'export'` in `next.config.js`).

## Deployment Options

### Option 1: AWS S3 (Static Website Hosting)

This is the primary target for this architecture.

1.  **Build**: Run `npm run build`.
2.  **Upload**: Upload the contents of the `out/` directory to your S3 bucket.
3.  **Permissions**: Ensure the S3 bucket is configured for static website hosting or is accessible via CloudFront.
4.  **Routing (Important)**:
    *   **S3 Website Hosting**: Configure the "Error document" to be `index.html`. This ensures that if a user refreshes a page like `/bugs/123`, S3 serves `index.html`, allowing the client-side router to handle the URL.
    *   **CloudFront**: Create a custom error response for 403 and 404 errors to return `index.html` with a 200 OK status.

### Option 2: Vercel

Vercel automatically detects Next.js projects.

1.  **Push to Git**: Push your code to a Git repository.
2.  **Import**: Import the project into Vercel.
3.  **Settings**:
    *   **Framework Preset**: Next.js
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `out` (Vercel might default to `.next`, but `out` is correct for static export).
4.  **Environment Variables**: Add your `NEXT_PUBLIC_...` variables in the Vercel dashboard.

### Option 3: Netlify

1.  **Push to Git**: Push your code to a Git repository.
2.  **Import**: Import the project into Netlify.
3.  **Settings**:
    *   **Build Command**: `npm run build`
    *   **Publish Directory**: `out`
4.  **Environment Variables**: Add your `NEXT_PUBLIC_...` variables in the Netlify dashboard.
5.  **Redirects**: Create a `_redirects` file in the `public/` folder (or add to build output) with the following content to support client-side routing:
    ```
    /*  /index.html  200
    ```

## Troubleshooting

### 404 on Refresh
If you navigate to a page (e.g., `/bugs`) and refresh, and get a 404 error from the host, it means your hosting provider is not configured for SPA routing. You must configure it to serve `index.html` for all unknown routes.

### CORS Errors
If you see CORS errors in the browser console when the app tries to fetch data:
1.  Check your AppFlyte Collection DB settings.
2.  Ensure the domain you are hosting on is allowed to make requests to the AppFlyte API.

### Missing Data
If the application loads but shows no data:
1.  Check the browser console for errors.
2.  Verify that `NEXT_PUBLIC_APPFLYTE_COLLECTION_BASE_URL` and `NEXT_PUBLIC_APPFLYTE_COLLECTION_API_KEY` are correctly set and loaded.
3.  Check the Network tab to see if the requests to AppFlyte are failing (401 Unauthorized, 404 Not Found, etc.).
