# Static SEO publishing for screenings4u.com

This GitHub Pages site serves static HTML. Browser-side Supabase updates are not enough to change View Source or the HTML seen by non-JavaScript crawlers.

The workflow runs every 5 minutes (GitHub schedules may be delayed) and can also run manually. It reads only `active` main-site pages via the Supabase public view `testing_published_page_settings`. It updates existing HTML `title`, `meta description`, `canonical`, and `robots` values without modifying body content, layout, customer records or Cloudflare DNS. Blank SEO fields retain their existing HTML values. Draft pages are excluded by the view.

## Enable after reviewing the PR
1. In GitHub repository Settings → Secrets and variables → Actions, add repository secrets:
   - `SUPABASE_URL`: `https://elpbnytpciqnbexiaebp.supabase.co`
   - `SUPABASE_ANON_KEY`: this project's public **anon** key (never the service role key).
2. Merge this PR into `main`.
3. GitHub → Actions → **Publish managed SEO to GitHub Pages** → Run workflow. Ensure the run is green. Branch protection must permit GitHub Actions write access or the push will fail.
4. After Pages publishes, open View Source on the homepage and compare the meta description to the management portal.
5. SEO updates thereafter normally reach HTML after the workflow and GitHub Pages deployment, **not instantly**. No DNS changes are needed.

Safety: scripts only operate on existing .html files inside the repo; routes must already exist. The view does not expose draft pages. A bad Supabase response fails the action instead of altering site files. Navigation and visual content are not changed here.
