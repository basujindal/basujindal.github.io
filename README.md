# basujindal.me

## Adding a New Blog Post

### 1. Create the Markdown File

Create a new file in `/blogs/` with the naming format `POST_NAME.md`:

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

Place any images in `/blogs/images/` and reference them in your markdown:

```markdown
![Description](../../images/your-image.png)
```

### 3. Add Blog Entry to Listing Page

Edit `/html/blogs.html` and add a new entry to the `blogs` array:

```javascript
{ slug: 'POST_NAME', description: 'Brief description of the post' }
```

The title and date are automatically read from the markdown front matter.

### 4. Update Sitemap

Add the new post to `sitemap.xml`:

```xml
<url>
  <loc>https://basujindal.github.io/html/post.html?section=blogs&amp;p=POST_NAME</loc>
  <priority>0.6</priority>
</url>
```

### 5. Deploy

Commit and push to `main` branch. GitHub Actions will automatically deploy.

---

## Adding a New Photo

### 1. Add the Image File

Place your image in the `/astrophotos/` directory. Supported formats: `.jpg`, `.png`

### 2. Add Gallery Entry

Edit `/html/photography.html` and add a new figure inside the gallery:

```html
<figure class="gallery-item"
        data-src="../astrophotos/YourImage.jpg"
        data-title="Photo Title"
        data-description="Description of the photo"
        data-camera="Camera Model"
        data-lens="Lens Model"
        data-settings="ISO, Aperture, etc."
        data-location="Location"
        data-date="YYYY-MM-DD"
        data-alt="Alt text for accessibility">
  <img src="../astrophotos/YourImage.jpg" alt="Alt text" loading="lazy">
  <figcaption><h3>Photo Title</h3></figcaption>
</figure>
```

### 3. Deploy

Commit and push to `main` branch.

---

## Draft/In-Progress Content

For work-in-progress posts, use the `/inprogress/` directory instead:
- Markdown files go in `/inprogress/`
- Images go in `/inprogress/images/`
- Access via `html/post.html?section=inprogress&p=POST_NAME`

Move to `/blogs/` when ready to publish.

## To Do 

- [ ] Move logout button to the bottom
- [ ] Login at blog return no blog selected nad login is not successful
- [ ] Update comments UI
- [ ] Visit count for all pages (blogs, thoughts, diffchecker, photos) on login just visible to basujindal
- [ ] Display the blog posts and like and views in admin portal
- [ ] Show full preview
- [ ] Make blog like not anon?
- [ ] Check how multiple images are posted
- [ ] Split large files into smaller, eespcially thoughts.js and any files greater than 500 lines
- [ ] Keep deleted posts and edit history for thoughts just in database
- [x] Add like and comment option to blogs similar to thoughts but allow anonymous or github login 
- [x] No need to display exact time on hover on post in thoughts, just date is good
