# basujindal.me

## Adding a New Blog Post

### 1. Create the Markdown File

Create a new file in `/blog-posts/` with the naming format `POST_NAME.md`:

```markdown
---
title: "Your Post Title"
date: YYYY-MM-DD
---

## Section Title

Your content here...
```

**Supported features:**
- **Math equations**: Use `$inline$` or `$$display$$` (LaTeX via KaTeX)
- **Code blocks**: Use fenced code blocks with language identifier for syntax highlighting
- **Images**: Reference as `![Alt text](../../images/filename.png)`

### 2. Add Images (if needed)

Place any images in `/blog-posts/images/` and reference them in your markdown:

```markdown
![Description](../../images/your-image.png)
```

### 3. Add Blog Entry to Listing Page

Edit `/blogs/index.html` and add a new entry to the `BLOG_LIST_CONFIG.items` array:

```javascript
{ slug: 'POST_NAME', description: 'Brief description of the post' }
```

The title and date are automatically read from the markdown front matter.

### 4. Update Sitemap

Add the new post to `sitemap.xml`:

```xml
<url>
  <loc>https://basujindal.me/post/?section=blogs&amp;p=POST_NAME</loc>
  <priority>0.6</priority>
</url>
```

### 5. Deploy

Commit and push to `main` branch. GitHub Actions will automatically deploy.

---

## Adding a New Photo

### 1. Add the Image File

Place your image in the `/astrophotos/` directory. Supported formats: `.jpg`, `.png`

### 2. Generate WebP Versions

Convert to full-res and thumbnail WebP:
```bash
# For 16-bit PNGs, convert to 8-bit JPEG first:
sips -s format jpeg "astrophotos/YourImage.png" --out /tmp/temp.jpg
cwebp -q 85 /tmp/temp.jpg -o "astrophotos/YourImage.webp"

# For JPEGs, convert directly:
cwebp -q 85 "astrophotos/YourImage.jpg" -o "astrophotos/YourImage.webp"

# Generate 800px thumbnail:
sips -Z 800 /tmp/temp.jpg --out /tmp/thumb.jpg
cwebp -q 80 /tmp/thumb.jpg -o "astrophotos/thumbnails/YourImage.webp"
```

### 3. Add Gallery Entry

Edit `/photography/index.html` and add a new figure inside the gallery:

```html
<figure class="gallery-item"
        data-src="../astrophotos/YourImage.webp"
        data-title="Photo Title"
        data-description="Description of the photo"
        data-camera="Camera Model"
        data-lens="Lens Model"
        data-settings="ISO, Aperture, etc."
        data-location="Location"
        data-date="YYYY-MM-DD"
        data-alt="Alt text for accessibility">
  <img src="../astrophotos/thumbnails/YourImage.webp" alt="Alt text" loading="lazy">
  <figcaption><h3>Photo Title</h3></figcaption>
</figure>
```

### 4. Deploy

Commit and push to `main` branch.

---

## Draft/In-Progress Content

For work-in-progress posts, use the `/drafts/` directory instead:
- Markdown files go in `/drafts/`
- Images go in `/drafts/images/`
- Access via `/post/?section=inprogress&p=POST_NAME`

Move to `/blog-posts/` when ready to publish.

## To Do

- [ ] Create another private repo like thoughts-api with all the blogs/data and only add the final built (maybe also add minify) output to the public repo
- [ ] Show everthing in admin portal
- [ ] Login at blog return no blog selected and login is not successful
- [ ] Update comments UI
- [ ] Display the blog posts and like and views in admin portal
- [ ] Keep deleted posts and edit history for thoughts just in database?