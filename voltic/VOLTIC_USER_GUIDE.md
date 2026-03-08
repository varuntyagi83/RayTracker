# Voltic User Guide
## Complete Documentation for Meta Advertising Intelligence & Creative Generation Platform

**Version:** 1.0
**Last Updated:** February 2026
**Platform:** Web Application (Next.js)

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Core Features](#core-features)
4. [Workspace Dashboard](#workspace-dashboard)
5. [Ad Discovery & Competitor Intelligence](#ad-discovery--competitor-intelligence)
6. [Boards & Swipe Files](#boards--swipe-files)
7. [AI-Powered Variations](#ai-powered-variations)
8. [Ad Generator](#ad-generator)
9. [Assets & Product Catalog](#assets--product-catalog)
10. [Brand Guidelines](#brand-guidelines)
11. [Automations](#automations)
12. [Reports & Analytics](#reports--analytics)
13. [Campaign Analysis](#campaign-analysis)
14. [Creative Studio](#creative-studio)
15. [Decomposition Tool](#decomposition-tool)
16. [Competitors Tracking](#competitors-tracking)
17. [Credits & Billing](#credits--billing)
18. [Settings & Configuration](#settings--configuration)
19. [Best Practices](#best-practices)
20. [Troubleshooting](#troubleshooting)
21. [API & Integrations](#api--integrations)

---

## Introduction

### What is Voltic?

Voltic is an all-in-one SaaS platform that unifies Meta (Facebook/Instagram) advertising analytics, competitor intelligence, automated reporting, social comment monitoring, and AI-powered creative generation into a single workspace.

**Think of Voltic as:** Supermetrics + AdSpy + Jasper combined into one platform.

### Key Capabilities

- **Competitor Intelligence:** Discover and analyze competitor ads across Meta's Ad Library
- **Creative Generation:** AI-powered ad variations and text overlay composition
- **Automated Reporting:** Schedule performance, competitor, and comment reports to Slack
- **Product Decomposition:** Extract product information from competitor ads using AI
- **Swipe File Management:** Organize and categorize saved ads in boards
- **Multi-Account Analytics:** Connect up to 91+ Meta ad accounts per workspace
- **AI Creative Tools:** Generate variations, compose text on images, edit product photos

### Who is Voltic For?

- **Performance Marketers:** Track competitor strategies and automate reporting
- **Creative Teams:** Generate ad variations at scale and build swipe files
- **E-commerce Brands:** Analyze competitor product positioning and create product-based ads
- **Agencies:** Manage multiple client workspaces with centralized intelligence
- **Social Media Managers:** Monitor ad performance and generate platform-specific copy

---

## Getting Started

### Account Setup

1. **Sign Up**
   - Visit your Voltic instance URL
   - Click "Sign Up" on the login page
   - Enter your email and password (minimum 6 characters)
   - Verify your email address

2. **Create Your Workspace**
   - Upon first login, you'll be prompted to create a workspace
   - Enter workspace name (e.g., "Acme Marketing Team")
   - Invite team members via email (optional)

3. **Connect Meta Ad Accounts**
   - Navigate to **Settings** → **Ad Accounts**
   - Click "Connect Meta Account"
   - Authenticate with Facebook/Meta
   - Select ad accounts to sync (up to 91+ accounts)

4. **Set Up Slack Integration** (Optional)
   - Go to **Settings** → **Integrations**
   - Click "Connect Slack Workspace"
   - Authorize Voltic to post to Slack
   - Select default channel for reports

### Navigation Overview

**Main Navigation (Left Sidebar):**
- **Home** — Workspace overview dashboard
- **Automations** — Scheduled reports and alerts
- **Discover** — Ad library search and competitor intelligence
- **Boards** — Saved ad collections (swipe files)
- **Variations** — AI-powered ad variation generator
- **Ad Generator** — Text overlay composition tool
- **Assets** — Product catalog and background images
- **Reports** — 6 report types (Top Ads, Campaigns, Creatives, etc.)
- **Campaign Analysis** — Deep-dive ad account analytics
- **Creative Studio** — AI creative assistant
- **Brand Guidelines** — Brand voice and visual identity
- **Decomposition** — Product extraction from competitor ads
- **Competitors** — Tracked competitor brands
- **Credits** — AI feature credit balance
- **Settings** — Workspace configuration

---

## Core Features

### Workspace Concept

**What is a Workspace?**
- Top-level container for all your data
- Users belong to workspaces
- All data is workspace-scoped (ad accounts, boards, automations, etc.)
- Each workspace has its own credit balance

**Workspace Roles:**
- **Owner** — Full access, billing, user management
- **Admin** — Full access except billing
- **Member** — Standard access to all features
- **Viewer** — Read-only access

### Credit System

Voltic uses credits for AI-powered features:

| Feature | Cost |
|---------|------|
| AI Variation (per strategy) | 10 credits |
| Product Decomposition | 5 credits |
| AI Image Generation | 15 credits |
| AI Image Editing (Gemini) | 12 credits |
| Creative Studio Chat Message | 3 credits |

**How to Get Credits:**
- Purchase credit packs in **Settings** → **Billing**
- Credits are workspace-scoped (shared by all members)
- Never expire

---

## Workspace Dashboard

**Location:** `/home`

### Overview

The Home dashboard provides a bird's-eye view of your workspace activity:

**Key Metrics:**
- Total ad accounts connected
- Active automations count
- Credit balance
- Saved ads count
- Recent activity feed

**Quick Actions:**
- Create automation
- Search ads in Discover
- Generate variations
- View reports

### Recent Activity

The activity feed shows:
- Automation runs (successful/failed)
- New ads saved to boards
- Variations generated
- Credits used
- Team member actions

**Filtering:**
- By action type (automations, variations, etc.)
- By date range (last 7/30/90 days)
- By team member

---

## Ad Discovery & Competitor Intelligence

**Location:** `/discover`

### What is Discover?

Discover is your Meta Ad Library search interface with advanced filtering, bulk actions, and AI insights.

### How to Search for Ads

1. **Enter Search Query**
   - Type brand name, product name, or keyword in the search box
   - Example: "Nike running shoes" or "Casper mattress"

2. **Apply Filters**
   - **Format:** All Formats, Image, Video, Carousel
   - **Platform:** Facebook, Instagram, Messenger, Audience Network
   - **Status:** Active, Inactive, All
   - **Date Range:** Last 7/30/90 days, Custom range

3. **Click "Search"**
   - Voltic queries Meta's Ad Library
   - Results appear as cards with previews

### Ad Cards

Each ad card shows:
- Ad creative (image/video thumbnail)
- Brand name
- Headline and body copy
- Platform badges (FB, IG, etc.)
- Format badge (Image, Video, Carousel)
- Active/Inactive status
- First seen / Last seen dates

### Actions on Ads

**Single Ad Actions:**
- **Save to Board** — Add to an existing or new board
- **Save as Competitor** — Track this brand in Competitors list
- **Analyze** — View AI-generated insights (hooks, CTAs, messaging strategy)
- **Decompose** — Extract product details using AI
- **Generate Variations** — Create variations based on this ad
- **Compare** — Add to comparison tray (compare up to 4 ads)
- **View on Meta** — Open in Meta Ad Library

**Bulk Actions:**
1. Select multiple ads using checkboxes
2. Click toolbar button:
   - **Create Board** — Save all selected ads to a new board
   - **Save to Existing Board** — Add to an existing board
   - **Compare** — Compare selected ads side-by-side

### AI Insights Panel

When you click "Analyze" on an ad, Voltic uses GPT-4o to analyze:
- **Hook:** Opening sentence/visual strategy
- **Pain Point:** Problem being addressed
- **Value Proposition:** Key benefit communicated
- **Call-to-Action:** CTA text and placement
- **Messaging Strategy:** Overall approach (emotional, logical, urgency, etc.)
- **Visual Elements:** Color scheme, composition, focal points

**Insight Types:**
- **Cached Insights:** Previously analyzed ads load instantly
- **Fresh Analysis:** First-time analysis uses 3 credits

### Save as Competitor (New Feature)

**What It Does:**
- Saves ad metadata to your Competitors list in one click
- No need to manually decompose first
- Automatically extracts: brand name, headline, platform, format

**How to Use:**
1. Find an ad from a competitor brand
2. Click "Save as Competitor" button (user icon)
3. Ad metadata is saved to `/competitors`
4. You can now track all ads from this brand

### Create Board from Discover (New Feature)

**What It Does:**
- Create a new swipe file board directly from search results
- Pre-populate with selected ads
- Streamlines inspiration collection workflow

**How to Use:**
1. Search for ads (e.g., "fitness apparel")
2. Select 5-10 ads using checkboxes
3. Click "Create Board" button in toolbar
4. Enter board name (e.g., "Fitness Ad Swipe")
5. Board is created with all selected ads saved

### Comparison Feature

**How to Compare Ads:**
1. Click "Compare" button on 2-4 ads
2. Ads are added to comparison tray (bottom of screen)
3. Click "Compare Now" in tray
4. View side-by-side comparison with AI analysis

**Comparison Report Includes:**
- Visual similarity score
- Messaging strategy differences
- Shared themes and unique angles
- Recommendations for differentiation

---

## Boards & Swipe Files

**Location:** `/boards`

### What are Boards?

Boards are collections of saved ads organized by theme, campaign, or inspiration category. Think of them as Pinterest boards for ads.

### Create a Board

1. **From Boards Page:**
   - Click "New Board" button
   - Enter board name (e.g., "Holiday Campaign Inspiration")
   - Add optional description
   - Click "Create"

2. **From Discover:**
   - Search for ads
   - Select ads to save
   - Click "Create Board"
   - Enter name and create

### Add Ads to Boards

**Option 1: From Discover**
- Click "Save to Board" on any ad card
- Select existing board or create new
- Ad is saved with metadata

**Option 2: From Board Detail Page**
- Open a board
- Click "Add Ads" button
- Search for ads in mini-search
- Click "Save" on each ad

### Board Detail Page

**Location:** `/boards/[board-id]`

**Features:**
- Grid view of all saved ads
- Filter by format (image/video/carousel)
- Filter by platform (Facebook/Instagram/etc.)
- Sort by date saved, date active, brand name

**Actions per Ad:**
- **Analyze** — View AI insights
- **Decompose** — Extract product details
- **Generate Variations** — Create variations from this ad
- **Remove from Board** — Unlink (doesn't delete the ad data)
- **View on Meta** — Open in Ad Library

### Variation Modal (New Features)

When you click "Generate Variations" from a board ad:

1. **Select Your Product:**
   - Choose from existing assets OR upload new product image
   - Enter product name and description

2. **Choose Channel:**
   - Facebook, Instagram, TikTok, LinkedIn, Google Ads
   - AI adapts copy tone to platform

3. **Select Strategies:**
   - Hero Product (product-centric)
   - Curiosity (pattern interrupt)
   - Pain Point (problem-solution)
   - Proof Point (social proof, stats)
   - Image Only (visual-first, minimal text)
   - Text Only (copy-heavy)

4. **Advanced Options:**
   - Product angle (front, side, 3/4 view, top-down)
   - Lighting style (studio, natural, golden hour, dramatic)
   - Background style (solid white, lifestyle, outdoor, gradient)
   - Custom instruction (free-form text)
   - Brand guideline (optional)

5. **Generate:**
   - Each strategy costs 10 credits
   - AI generates text + image for each strategy
   - Variations appear in Variation History

**Scrolling Fix Applied:**
- Modal content now scrolls properly on all screen sizes
- No content cut-off on smaller screens

---

## AI-Powered Variations

**Location:** `/variations`

### What is the Variations Page?

A dedicated workspace for generating AI-powered ad variations at scale. Supports two sources:
1. **Competitor Ads** — Generate variations inspired by competitor creatives
2. **Your Products** — Generate variations starting from your product images

### Variation Sources

#### Competitor-Based Variations

**How It Works:**
1. Select a board (your swipe files)
2. Pick a competitor ad from that board
3. Choose your product to feature
4. AI analyzes competitor creative and generates new versions featuring YOUR product

**Use Case:**
- "Take this Nike ad structure and create a version for my running shoes"
- Preserves creative strategy while swapping product

#### Asset-Based Variations (New Feature)

**How It Works:**
1. Upload your product image OR select from asset library
2. Choose brand guideline (optional, for color palette)
3. Set creative options (angle, lighting, background)
4. Select strategies
5. AI edits your product image using **Gemini** while preserving product labels exactly

**Use Case:**
- "Here's my vitamin bottle — create 6 variations with different backgrounds and lighting"
- Perfect for e-commerce product photography transformation

### Channel Selection (New Feature)

Choose the advertising platform to optimize copy for:

| Channel | Copy Style |
|---------|------------|
| **Facebook** | Conversational, emoji-friendly, engagement-focused, longer storytelling |
| **Instagram** | Visual-first, hashtag-ready, shorter punchy copy, aspirational tone |
| **TikTok** | Gen-Z tone, trend-aware, ultra-short, casual and authentic |
| **LinkedIn** | Professional, thought-leadership tone, B2B-friendly, data-driven |
| **Google Ads** | Keyword-focused, direct response, respect character limits, action-oriented |

**Default:** Facebook (most versatile)

### Strategy Descriptions

**1. Hero Product**
- **Text:** Product name in headline, feature-benefit structure
- **Image:** Product centered, clean professional look, prominent focal point
- **Best For:** E-commerce, product launches, clear value props

**2. Curiosity**
- **Text:** Pattern-interrupt headline, "What if..." or "The secret to..." hooks
- **Image:** Dramatic lighting, unexpected angle, visually intriguing composition
- **Best For:** Engagement campaigns, top-of-funnel awareness

**3. Pain Point**
- **Text:** Calls out specific problem, positions product as solution
- **Image:** Visual contrast or metaphor, product appears as clear solution
- **Best For:** Problem-aware audiences, consideration stage

**4. Proof Point**
- **Text:** Stats, testimonials, social proof, "Join 10,000+ customers"
- **Image:** Premium, trustworthy, aspirational quality, credibility cues
- **Best For:** Conversion campaigns, overcoming objections

**5. Image Only**
- **Text:** Minimal or no text, product name only
- **Image:** Stunning, eye-catching product photo, high production value
- **Best For:** Visual platforms (Instagram), brand awareness

**6. Text Only**
- **Text:** Long-form copy, storytelling, detailed explanation
- **Image:** Simple background with product, text is the hero
- **Best For:** Complex products, educational content

### Creative Options (Asset-Based Only)

**Product Angle:**
- Front View — Straight-on, symmetrical
- Side View — Profile, shows depth
- 3/4 View — Angled, dynamic perspective
- Top-Down — Flat lay, overhead shot

**Lighting Style:**
- Studio Lighting — Clean, professional, shadowless
- Natural Lighting — Soft, window light, organic feel
- Golden Hour — Warm, sunset glow, aspirational
- Dramatic Lighting — High contrast, moody, bold shadows

**Background Style:**
- Solid White — E-commerce standard, minimal distraction
- Lifestyle — Product in use, contextual setting
- Outdoor — Nature, environmental context
- Gradient — Modern, colorful, abstract

**Custom Instruction:**
- Free-form text field for specific requests
- Example: "Place on a wooden shelf with plants"
- Example: "Add subtle shadow for depth"

### Variation History

All generated variations appear in the history section with:
- Thumbnail preview
- Strategy badge
- Source indicator (Competitor or Asset)
- Creation date
- Download button
- Delete button

**Actions:**
- **Download** — Save image to your device
- **Delete** — Remove from history (cannot be undone)

### Cost

- **10 credits per strategy** (unchanged)
- Example: Generate 3 strategies = 30 credits
- Asset-based variations use Gemini (12 credits for image editing + AI text generation included in 10 credit cost)

---

## Ad Generator

**Location:** `/ad-generator`

### What is Ad Generator?

A batch text overlay composition tool that lets you create M×N ad variations by combining:
- **M backgrounds** (product images, lifestyle photos, brand assets)
- **N text variants** (headlines, ad copy, CTAs)

**Example:**
- 5 backgrounds × 10 text variants = **50 ad previews** generated in ~20 seconds

### When to Use Ad Generator

**Best For:**
- Creating multiple ad creatives at scale
- A/B testing different copy on the same visual
- Brand awareness campaigns with consistent visuals
- Social media content calendars

**Not Ideal For:**
- Complex image editing (use Variations with Gemini instead)
- Product photography transformation (use Asset-Based Variations)

### Step-by-Step Workflow

#### Step 1: Select Brand Guideline

**Purpose:** Links ads to your brand identity for consistent styling

**How:**
1. Click guideline dropdown
2. Select from existing brand guidelines
3. If none exist, create one in **Brand Guidelines** page first

**What It Controls:**
- Which assets are available (background selector shows assets linked to this guideline)
- Default color palette (optional, can override manually)

#### Step 2: Select Background Images

**How:**
1. Asset grid shows all images linked to selected guideline
2. Click to select (multi-select enabled)
3. Selected assets show checkmark overlay
4. Can select 1-20 backgrounds

**Actions:**
- **Upload New Asset** — Click "Upload" button, select image, auto-links to guideline
- **Generate Background** — Click "Generate" button, enter AI prompt (e.g., "Studio white background with product shadow"), costs 15 credits
- **Deselect All** — Clear current selection

#### Step 3: Enter Text Variants

**How:**
1. Start with one text input field
2. Type headline, ad copy, or CTA
3. Click "+ Add Variant" to add more fields (up to 20)
4. Click "×" to remove a variant

**Tips:**
- Keep it concise (2-10 words works best)
- Test different hooks: question vs statement vs command
- Include emoji if appropriate for platform
- Test with and without CTA

**Examples:**
- "Your Perfect Morning Starts Here ☕"
- "Limited Time: 30% Off All Coffee"
- "Voted #1 Coffee by Barista Magazine"
- "Wake Up to Better Coffee"

#### Step 4: Styling Controls

**Font Family:**
- Select from dropdown: Inter, Roboto, Playfair Display, Montserrat, Open Sans, Lato
- Default: Inter (clean, modern, high legibility)

**Font Size:**
- Slider: 24px - 96px
- Default: 48px
- Larger for headlines (60-72px), smaller for body (36-48px)

**Text Color:**
- Color picker (hex input)
- Default: #FFFFFF (white)
- Ensure contrast with background for readability
- Use brand colors from guideline

**Text Position:**
- **Center** — Middle of image (default)
- **Top** — Top center with padding
- **Bottom** — Bottom center with padding
- **Top-Left** — Upper left corner
- **Top-Right** — Upper right corner
- **Bottom-Left** — Lower left corner
- **Bottom-Right** — Lower right corner
- **Custom** — Click on preview to set X/Y coordinates

**Text Effects:**
- Automatic drop shadow for readability (cannot be disabled)
- Multi-line wrapping (auto-wraps based on image width)

#### Step 5: Generate Previews

**How:**
1. Click "Generate Previews" button
2. Shows count: "Generate Previews (50)" for 5 backgrounds × 10 texts
3. Processing happens in batches of 5 (concurrency control)
4. Progress indicator shows "Generating 50 previews..."

**What Happens:**
- Server fetches all background images
- For each combination:
  - Composites text onto background using Sharp (server-side)
  - Applies font, size, color, position, shadow
  - Uploads to Supabase Storage
  - Returns public URL
- Results appear in Preview Grid

**Time Estimate:**
- ~20 seconds for 50 previews
- ~40 seconds for 100 previews
- Depends on image sizes and server load

#### Step 6: Review & Approve

**Preview Grid:**
- Responsive grid layout (3-4 columns on desktop)
- Each card shows:
  - Composited ad preview
  - Text variant displayed
  - Background asset name
  - Approve/Reject buttons
  - Download button

**Actions:**
- **✓ Approve** — Mark as approved (green border)
- **× Reject** — Mark as rejected (red border, grayed out)
- **Download** — Save individual preview to device

**Status:**
- **Pending** — Default state (gray)
- **Approved** — Green checkmark, green border
- **Rejected** — Red X, grayed out

#### Step 7: Save Approved Ads

**How:**
1. Click "Save Approved (X)" button
2. Only approved ads are saved
3. Server creates database records with metadata
4. Ads appear in Ads History section

**Metadata Saved:**
- Brand guideline ID
- Background asset ID
- Text variant
- Font family, size, color
- Text position
- Image URL and storage path
- Dimensions (width × height)

### Ads History

**Location:** Bottom of `/ad-generator` page

**Features:**
- Grid view of all previously saved ads
- Filter by brand guideline
- Sort by creation date
- Pagination (20 per page)

**Actions per Ad:**
- **Download** — Save to device
- **Delete** — Permanently remove from workspace

### Tips for Best Results

**Background Selection:**
- Use high-resolution images (1080×1080 minimum)
- Ensure backgrounds have negative space for text
- Avoid busy/cluttered backgrounds (text won't be legible)
- Consistent aspect ratio (1:1 or 4:5 for social)

**Text Variants:**
- Start with 5-10 variants for A/B testing
- Test different emotional tones (urgent vs calm vs playful)
- Vary length (short punchy vs longer descriptive)
- Include numbers/stats when possible ("Save 30%", "Join 10K+")

**Styling:**
- High contrast (white text on dark background or vice versa)
- Avoid mid-tones (gray text on gray background)
- Match font to brand personality (playful = rounded, professional = sans-serif)
- Use larger font sizes for mobile (60px+)

**Position:**
- Center for balanced composition
- Bottom for "billboard" style (product visible above)
- Top-Left for storytelling (Western reading pattern)

---

## Assets & Product Catalog

**Location:** `/assets`

### What are Assets?

Assets are your product images and background photos used throughout Voltic for:
- Ad Generator backgrounds
- Variation generation source images
- Brand guideline visual references
- Decomposition comparison

### Asset Management

#### Upload New Asset

**How:**
1. Click "Upload Asset" button
2. Drag & drop image or click to browse
3. Enter required fields:
   - **Name** — Product name (e.g., "Vitamin D3 Drops")
   - **Description** — Optional product details (e.g., "High-potency liquid supplement")
4. Optional fields:
   - **Brand Guideline** — Link to a guideline (enables asset for Ad Generator)
   - **Category** — Tag for organization (e.g., "Supplements", "Backgrounds")
5. Click "Upload"

**File Requirements:**
- **Formats:** PNG, JPG, JPEG, WebP
- **Max Size:** 10MB per image
- **Recommended:** 1080×1080px minimum for quality

#### Asset Grid

**Features:**
- Thumbnail grid view
- Search by name
- Filter by brand guideline
- Filter by category
- Sort by upload date or name

**Actions per Asset:**
- **Edit** — Update name, description, guideline linkage
- **Delete** — Permanently remove (cannot be undone)
- **Use in Ad Generator** — Quick link to create ads with this background
- **Generate Variations** — Quick link to create asset-based variations

#### Linking to Brand Guidelines (New Feature)

**Why Link Assets?**
- Makes asset available in Ad Generator background selector
- Ensures brand-consistent asset usage
- Organizes assets by brand/client

**How to Link:**
1. Click "Edit" on an asset
2. Select brand guideline from dropdown
3. Click "Save"
4. Asset now appears in Ad Generator when that guideline is selected

### Asset-Based Variations

**Quick Access:**
- Click "Generate Variations" button on any asset card
- Redirects to `/variations` with asset pre-selected
- Choose strategies and generate

---

## Brand Guidelines

**Location:** `/brand-guidelines`

### What are Brand Guidelines?

Brand Guidelines define your brand's:
- Voice and tone
- Color palette
- Typography preferences
- Messaging principles
- Visual style

Used by AI to generate on-brand variations and maintain consistency.

### Create Brand Guideline

**How:**
1. Click "New Guideline" button
2. Enter required fields:
   - **Name** — Brand or client name (e.g., "Acme Inc.")
   - **Voice & Tone** — Description of brand personality (e.g., "Professional yet approachable, data-driven, trustworthy")
   - **Color Palette** — Hex codes (e.g., "#2D5F2D, #F5F0E6, #FFFFFF")
3. Optional fields:
   - **Typography** — Preferred fonts (e.g., "Montserrat for headlines, Open Sans for body")
   - **Messaging Principles** — Key themes (e.g., "Sustainability, Innovation, Customer Success")
   - **Visual Style** — Aesthetic description (e.g., "Minimalist, clean, modern, nature-inspired")
4. Click "Create"

### Guidelines in Use

**Where Guidelines are Applied:**
- **Variations Page** — AI uses voice/tone and color palette when generating ad copy and selecting colors
- **Ad Generator** — Links assets to guidelines for organized background selection
- **Creative Studio** — AI assistant references guidelines in chat responses

### Edit/Delete Guidelines

**Edit:**
- Click "Edit" on guideline card
- Update any field
- Click "Save"

**Delete:**
- Click "Delete" button
- Confirm deletion (cannot be undone)
- Unlinks all assets (assets remain, just lose guideline association)

---

## Automations

**Location:** `/automations`

### What are Automations?

Scheduled tasks that fetch data, format it, and deliver to Slack automatically. Three types:
1. **Performance Reports** — Ad account metrics (spend, ROAS, CTR, etc.)
2. **Competitor Reports** — New ads from tracked competitors
3. **Comment Monitoring** — Social comments on your ads

### Automation Types

#### 1. Performance Automation

**What It Does:**
- Fetches metrics from connected Meta ad accounts
- Aggregates by campaign, ad set, or ad
- Formats as table or chart
- Sends to Slack channel

**Metrics Available:**
- Spend, Impressions, Clicks, CTR
- CPC, CPM, CPA
- Conversions, Conversion Rate
- ROAS (Return on Ad Spend)
- Reach, Frequency

**Frequency:**
- Daily, Weekly, Monthly
- Custom cron schedule (advanced)

**Use Case:**
- "Send daily spend report to #marketing-team every morning at 8am"

#### 2. Competitor Automation

**What It Does:**
- Monitors tracked competitors (from `/competitors`)
- Detects new ads in Meta Ad Library
- Sends summary to Slack with previews

**Filters:**
- By competitor brand
- By platform (Facebook, Instagram, etc.)
- By format (image, video, carousel)

**Use Case:**
- "Alert #competitor-intel when Nike launches new ads weekly"

#### 3. Comment Monitoring

**What It Does:**
- Fetches comments from your Meta ad posts
- Filters by sentiment (positive, negative, neutral)
- Sends to Slack for response

**Filters:**
- By ad campaign
- By sentiment score
- By keyword (e.g., "return", "shipping")

**Use Case:**
- "Send negative comments to #customer-support daily for response"

### Create Automation

#### Wizard Flow

**Step 1: Choose Type**
- Select Performance, Competitor, or Comment Monitoring

**Step 2: Configuration**

*For Performance:*
- Select ad accounts
- Choose metrics to include
- Set date range (yesterday, last 7 days, last 30 days)
- Select grouping (campaign, ad set, ad)

*For Competitor:*
- Select competitor brands to monitor
- Choose platforms
- Set lookback window (new ads in last X days)

*For Comments:*
- Select ad campaigns
- Set sentiment filter (all, positive, negative, neutral)
- Choose keywords to flag

**Step 3: Schedule**
- Frequency: Daily, Weekly, Monthly, Custom
- Time of day (e.g., 8:00 AM)
- Timezone (workspace default)

**Step 4: Delivery**
- Slack channel (dropdown of available channels)
- Message format: Table, Chart, List
- Include/exclude fields

**Step 5: Review & Activate**
- Preview sample report
- Click "Activate Automation"

### Manage Automations

**Automation List:**
- All automations displayed as cards
- Status badge: Active (green), Paused (yellow), Failed (red)
- Last run timestamp
- Next scheduled run

**Actions:**
- **Edit** — Update configuration
- **Pause/Resume** — Temporarily disable/enable
- **Run Now** — Trigger manual execution
- **Delete** — Permanently remove
- **View History** — See past runs and errors

### Troubleshooting Automations

**Common Issues:**

*Automation Failed:*
- Check ad account connection (may have expired)
- Verify Slack channel still exists
- Check workspace credit balance (comment monitoring uses AI)

*No Data Returned:*
- Verify date range has activity
- Check filters (may be too restrictive)
- Ensure ad accounts have data

*Slack Not Receiving:*
- Verify Slack integration is connected
- Check channel permissions (Voltic bot must be invited)
- Test with "Run Now" for immediate feedback

---

## Reports & Analytics

**Location:** `/reports/[report-type]`

### Report Types

#### 1. Top Ads

**What It Shows:**
- Best-performing ads by spend, ROAS, or conversions
- Thumbnails, copy, metrics
- Sortable by metric

**Filters:**
- Date range
- Ad account
- Campaign
- Minimum spend threshold

**Use Case:**
- "Show me the top 20 ads by ROAS in the last 30 days"

#### 2. Top Campaigns

**What It Shows:**
- Campaign-level performance
- Aggregated metrics
- Trend charts

**Filters:**
- Date range
- Ad account
- Objective (conversions, traffic, awareness)

#### 3. Top Creatives

**What It Shows:**
- Visual creative analysis
- Groups by image hash (same creative across multiple ads)
- Shows aggregate performance

**Filters:**
- Date range
- Format (image, video, carousel)

#### 4. Top Headlines

**What It Shows:**
- Most common headline text
- Performance by headline
- Word cloud visualization

**Use Case:**
- "What headline patterns drive the most conversions?"

#### 5. Top Landing Pages

**What It Shows:**
- Performance by destination URL
- Conversion rate by page
- Identifies top-converting landing pages

#### 6. Top Copy

**What It Shows:**
- Ad body text analysis
- Common phrases and themes
- Performance correlation

### Export Reports

**How:**
- Click "Export" button on any report
- Choose format: CSV, PDF
- Download to device

---

## Campaign Analysis

**Location:** `/campaign-analysis`

### What is Campaign Analysis?

Deep-dive analytics for connected Meta ad accounts. View performance across campaigns, ad sets, and individual ads with charts and tables.

### Features

**Account Selector:**
- Dropdown of connected ad accounts
- Multi-select for cross-account comparison

**Date Range Picker:**
- Presets: Last 7/30/90 days, This month, Last month
- Custom range selector

**Metric Selection:**
- Choose which KPIs to display
- Customizable table columns

**Breakdowns:**
- By campaign, ad set, ad
- By platform (Facebook, Instagram, etc.)
- By placement (feed, story, etc.)

**Charts:**
- Time series line charts
- Performance trend visualization
- Spend vs ROAS correlation

---

## Creative Studio

**Location:** `/creative-studio`

### What is Creative Studio?

An AI chat assistant for creative brainstorming, ad copy writing, and campaign planning. Powered by GPT-4o.

### Features

**Chat Interface:**
- Ask questions about ad strategy
- Request copy variations
- Get headline suggestions
- Brainstorm campaign concepts

**Context-Aware:**
- Knows your workspace data (boards, guidelines, competitors)
- References your brand voice from guidelines
- Suggests variations based on your saved ads

**Example Prompts:**
- "Write 10 Facebook ad headlines for our new product launch"
- "Analyze our top-performing ads and suggest common patterns"
- "Create a 30-day content calendar for Instagram"
- "Generate email subject lines for our Black Friday sale"

**Cost:**
- 3 credits per message

---

## Decomposition Tool

**Location:** `/decomposition`

### What is Decomposition?

AI-powered product extraction from competitor ads. Upload an ad image, and AI identifies:
- Product name
- Brand name
- Category
- Features
- Pricing (if visible)
- Target audience
- Value proposition

### How to Use

1. **Upload Ad Image:**
   - Drag & drop or click to browse
   - Supports PNG, JPG, WebP

2. **AI Analysis:**
   - Uses Gemini Vision API
   - Extracts product details in ~10 seconds
   - Costs 5 credits

3. **Review & Edit:**
   - AI-extracted fields appear in form
   - Edit any field manually
   - Add notes or observations

4. **Save as Asset:**
   - Click "Save as Asset" button
   - Product is added to your Assets catalog
   - Can be used in Variations and Ad Generator

### Use Cases

- **Competitor Product Catalog:** Build a database of competitor products
- **Inspiration Mining:** Extract products from saved ads for variation ideas
- **Market Research:** Analyze product positioning and messaging

---

## Competitors Tracking

**Location:** `/competitors`

### What is Competitors Tracking?

A centralized list of competitor brands you're monitoring. Powers competitor automations and Discover filters.

### Add Competitor

**Method 1: Manual Entry**
1. Click "Add Competitor" button
2. Enter brand name
3. Optional: Add industry, website, notes
4. Click "Save"

**Method 2: From Discover (New Feature)**
1. Search for ads in `/discover`
2. Click "Save as Competitor" on any ad
3. Brand is automatically added to list

### Competitor Cards

Each competitor shows:
- Brand name
- Industry tag
- Number of ads tracked
- Last ad seen date
- Website link

**Actions:**
- **View Ads** — Search Discover filtered to this brand
- **Create Automation** — Set up competitor monitoring
- **Edit** — Update details
- **Delete** — Remove from tracking

### Use Cases

- Track when competitors launch new campaigns
- Analyze competitor creative strategies
- Monitor pricing changes in ad copy
- Set up alerts for new ad activity

---

## Credits & Billing

**Location:** `/credits`

### Credit Balance

**Current Balance:**
- Displayed in top-right corner of all pages
- Workspace-level (shared by all members)

**Credit Usage:**
- View transaction history (credits spent/purchased)
- Filter by feature (variations, decomposition, etc.)
- Export credit report

### Purchase Credits

**How:**
1. Click "Buy Credits" button
2. Select credit pack:
   - **Starter:** 100 credits — $19
   - **Pro:** 500 credits — $79
   - **Enterprise:** 2,000 credits — $249
3. Enter payment details (Stripe)
4. Click "Purchase"
5. Credits added instantly

**Payment Methods:**
- Credit/debit card
- ACH transfer (Enterprise only)

### Credit Expiration

- Credits **never expire**
- Remain in workspace even if subscription canceled

---

## Settings & Configuration

**Location:** `/settings`

### Workspace Settings

**General:**
- Workspace name
- Default timezone
- Default currency

**Team Members:**
- Invite users via email
- Assign roles (Owner, Admin, Member, Viewer)
- Remove users

**Danger Zone:**
- Delete workspace (cannot be undone)
- Transfer ownership

### Ad Account Connections

**Connected Accounts:**
- List of linked Meta ad accounts
- Status (active, expired, error)
- Last synced timestamp

**Actions:**
- **Connect New Account** — Authenticate with Meta
- **Refresh Token** — Re-authenticate if expired
- **Disconnect** — Unlink account

### Integrations

**Slack:**
- Connect workspace
- Select default channel
- Test connection

**Webhooks:**
- Custom webhook URLs for automation events
- JSON payload structure

**API Keys:**
- Generate API key for programmatic access
- Revoke keys
- View API documentation

### Billing

**Subscription:**
- Plan name (Starter, Pro, Enterprise)
- Monthly cost
- Next billing date

**Payment Method:**
- Update card details
- View invoices
- Download receipts

**Usage:**
- Monthly API calls
- Storage used
- Credits consumed

---

## Best Practices

### Variation Generation

**Do's:**
- Start with 2-3 strategies to conserve credits
- Use high-quality source images (1080×1080 minimum)
- Write specific product descriptions for better AI output
- Test channel-specific copy (Facebook vs TikTok)
- Link assets to brand guidelines for consistency

**Don'ts:**
- Don't generate all 6 strategies at once (expensive, may not need all)
- Don't use low-resolution competitor ad screenshots
- Don't skip product description (AI needs context)
- Don't use generic instructions ("make it better")

### Ad Generator

**Do's:**
- Test 5-10 text variants initially
- Use high-contrast text colors
- Preview on mobile viewport (most users)
- Select backgrounds with negative space
- Batch generate for efficiency

**Don'ts:**
- Don't use busy/cluttered backgrounds
- Don't use mid-tone text colors (poor contrast)
- Don't exceed 15 words per text variant (readability)
- Don't forget to save approved ads (lose previews on refresh)

### Automations

**Do's:**
- Start with weekly frequency, adjust based on volume
- Test with "Run Now" before activating
- Use descriptive names ("Daily Spend Report - #marketing")
- Monitor first few runs for errors
- Set up Slack notifications for failures

**Don'ts:**
- Don't schedule hourly (rate limits, Slack spam)
- Don't include 20+ metrics (overwhelms recipients)
- Don't use generic channel (#general) — create dedicated channel
- Don't forget to pause when on vacation (unnecessary runs)

### Credit Management

**Do's:**
- Purchase credits in bulk (better per-credit cost)
- Monitor credit balance (visible in top-right)
- Use asset-based variations for e-commerce (more cost-effective than competitor-based)
- Archive unused variations to track spending

**Don'ts:**
- Don't let balance hit zero mid-campaign
- Don't over-generate (quality > quantity)
- Don't use Creative Studio for simple tasks (use free tools first)

---

## Troubleshooting

### Common Issues

#### "Ad Account Connection Expired"

**Cause:** Meta OAuth token expires after 60 days

**Fix:**
1. Go to **Settings** → **Ad Accounts**
2. Click "Refresh Token" on expired account
3. Re-authenticate with Facebook
4. Automations resume automatically

#### "Insufficient Credits"

**Cause:** Credit balance too low for operation

**Fix:**
1. Check credit balance in top-right
2. Click "Buy Credits" button
3. Purchase credit pack
4. Retry operation

#### "Variation Generation Failed"

**Possible Causes:**
- Low-quality source image (too small, blurry)
- Gemini API region restriction (not available in all countries)
- Invalid product description (missing required context)

**Fix:**
1. Check source image resolution (1080px minimum)
2. Verify Gemini API key in environment variables (admin only)
3. Add more detailed product description
4. Try different strategy (some strategies require specific inputs)

#### "Slack Message Not Delivered"

**Possible Causes:**
- Voltic bot not invited to channel
- Channel renamed or deleted
- Slack integration disconnected

**Fix:**
1. Verify Slack integration in **Settings** → **Integrations**
2. Invite `@Voltic` bot to target channel (`/invite @Voltic`)
3. Test with "Run Now" on automation
4. Check Slack workspace permissions (admin may have restricted bots)

#### "Preview Not Loading in Ad Generator"

**Cause:** Large image files, slow network, or server timeout

**Fix:**
1. Refresh page
2. Reduce number of combinations (try 5 backgrounds × 5 texts instead of 10×10)
3. Check image file sizes (compress if >2MB each)
4. Contact support if issue persists

---

## API & Integrations

### Voltic API

**Base URL:** `https://your-instance.voltic.app/api`

**Authentication:**
- API key in header: `Authorization: Bearer YOUR_API_KEY`
- Generate API key in **Settings** → **API Keys**

**Endpoints:**

**Ads:**
- `POST /api/ads/composite` — Single text overlay composition
- `POST /api/ads/composite-batch` — Batch composition
- `GET /api/ads/[id]/download` — Download generated ad

**Decomposition:**
- `POST /api/decompose` — Extract product from image

**Assets:**
- `POST /api/assets/generate-background` — AI background generation

**Studio:**
- `POST /api/studio/chat` — Creative Studio chat message
- `POST /api/studio/generate-image` — Image generation (DALL-E/SD)

**Extensions:**
- `GET /api/extension/boards` — List boards (Chrome extension)
- `POST /api/extension/save-ad` — Save ad from extension

**Webhooks:**
- `POST /api/webhooks/cron/automations` — Trigger scheduled automations
- `POST /api/webhooks/stripe` — Stripe billing events

### Slack Integration

**Setup:**
1. Go to **Settings** → **Integrations**
2. Click "Connect Slack"
3. Authorize Voltic app
4. Invite bot to channels: `/invite @Voltic`

**Slash Commands:**
- `/voltic search [query]` — Search ads from Slack
- `/voltic report [type]` — Generate quick report
- `/voltic credits` — Check credit balance

**Bot Mentions:**
- `@Voltic analyze [ad-url]` — Get AI insights on an ad
- `@Voltic compare [url1] [url2]` — Compare two ads

### Chrome Extension

**Install:**
1. Download from Chrome Web Store
2. Pin extension to toolbar
3. Click extension icon → "Connect to Voltic"
4. Enter workspace URL and API key

**Features:**
- Save ads to boards while browsing Facebook/Instagram
- One-click decomposition from ad previews
- Quick access to workspace from any page

---

## Glossary

**Ad Account** — Meta (Facebook) advertising account connected to Voltic for analytics

**Asset** — Product image or background photo stored in Voltic catalog

**Automation** — Scheduled task that fetches data and delivers to Slack

**Board** — Collection of saved ads organized by theme (swipe file)

**Brand Guideline** — Brand identity document defining voice, colors, typography

**Channel** — Advertising platform (Facebook, Instagram, TikTok, LinkedIn, Google)

**Competitor** — Brand being tracked for ad intelligence

**Credit** — Virtual currency for AI-powered features

**Decomposition** — AI extraction of product details from ad images

**Gemini** — Google's AI model used for image editing (preserves product labels)

**Strategy** — Variation approach (Hero Product, Curiosity, Pain Point, etc.)

**Variation** — AI-generated ad creative based on source ad or product

**Workspace** — Top-level container for all data (team, accounts, boards, etc.)

---

## Support & Contact

**Help Center:** [your-domain]/help

**Email Support:** support@voltic.app

**Live Chat:** Available in bottom-right corner (Mon-Fri 9am-5pm EST)

**Feature Requests:** [your-domain]/feedback

**Status Page:** status.voltic.app

**Community:** [your-domain]/community

---

## Appendix

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + /` | Toggle sidebar |
| `G then H` | Go to Home |
| `G then D` | Go to Discover |
| `G then B` | Go to Boards |
| `G then V` | Go to Variations |
| `G then A` | Go to Ad Generator |
| `Cmd/Ctrl + S` | Save current work |
| `Esc` | Close modal/dialog |

### Browser Support

**Supported Browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Not Supported:**
- Internet Explorer (any version)
- Opera Mini
- UC Browser

### Mobile App

**Status:** Coming Q3 2026

**Planned Features:**
- View boards and saved ads
- Push notifications for automations
- Mobile-optimized Ad Generator
- Quick ad saving from Instagram app

---

**Last Updated:** February 2026
**Version:** 1.0
**Document Maintained By:** Voltic Product Team

---

*For the most up-to-date documentation, visit your Voltic instance help center.*
