# AFOG Deployment Guide

## ✅ What's Been Fixed

1. **Removed AuthContext dependency** - All pages now use localStorage directly for authentication
2. **Updated all pages** - Added `export const dynamic = 'force-dynamic'` to force server-side rendering
3. **Simplified authentication** - No more context provider wrapping needed
4. **Fixed error handling** - Removed custom error pages that were causing build issues

## 🚀 How to Deploy to Vercel

### Step 1: Commit and Push to GitHub

```bash
cd /Users/abi/Documents/Automated-Factory-Farm-Objection-Generator
git add .
git commit -m "Fix: Remove AuthContext dependency and force dynamic rendering for Vercel deployment"
git push origin master
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository: `LarytheLord/Automated-Factory-Farm-Objection-Generator`
4. **Important**: Set the **Framework Preset** to `Next.js`
5. **Build Command**: Leave as default (`npm run build`)
6. **Output Directory**: Leave as default (`.next`)

### Step 3: Configure Environment Variables

In the Vercel project settings, add these environment variables:

```
GEMINI_API_KEY=your_google_gemini_api_key_here
USER_EMAIL=your_gmail_address_here
USER_PASS=your_gmail_app_password_here
NEXT_PUBLIC_BACKEND_URL=https://your-vercel-app.vercel.app
```

### Step 4: Deploy

Click "Deploy" and Vercel will build and deploy your application.

## ⚠️ Known Build Warnings

You may see these warnings during build - **THEY ARE SAFE TO IGNORE**:

1. **"Error in permits API route: TypeError: fetch failed"** - This happens because the backend isn't running during build. It will work in production.
2. **"NODE_ENV value" warning** - This is a Vercel configuration issue, doesn't affect functionality.

## 🎯 What to Do If Build Fails

If the build still fails on Vercel:

1. **Disable Static Generation**: The app is configured to use dynamic rendering, but Vercel might try to statically generate pages.
   
2. **Alternative: Deploy Backend Separately**
   - Deploy the backend to a separate service (Railway, Render, or Heroku)
   - Update `NEXT_PUBLIC_BACKEND_URL` to point to the backend URL

3. **Use Docker Deployment** (if Vercel doesn't work):
   ```bash
   docker build -t afog .
   docker run -p 3000:3000 -e GEMINI_API_KEY=your_key afog
   ```

## 📝 Post-Deployment Checklist

- [ ] Test the homepage loads
- [ ] Test permit browsing
- [ ] Try generating an objection letter
- [ ] Test user registration/login
- [ ] Verify email sending works (if configured)

## 🔧 Troubleshooting

### Authentication Not Working
- Clear browser localStorage
- Check that cookies are enabled
- Verify the backend is accessible

### API Errors
- Check that `NEXT_PUBLIC_BACKEND_URL` is set correctly
- Verify backend is running and accessible
- Check Vercel function logs for errors

### Build Fails
- Check Vercel build logs for specific errors
- Try deploying with `vercel --debug` for more information
- Consider using Docker deployment as fallback

## 📞 Support

If you encounter issues:
1. Check Vercel's deployment logs
2. Review the browser console for errors
3. Verify all environment variables are set correctly
