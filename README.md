# Friendly Budgets

A React application for managing personal finances with a 50/30/20 budget plan.

## Features

- Track income and expenses
- Categorize transactions (Essentials, Wants, Savings, Income)
- Visualize spending with interactive charts
- Compare actual spending to the 50/30/20 budget rule
- Drag and drop transactions between categories
- Voice commands for adding and updating transactions
- Personalized budget suggestions

## Technologies Used

- React
- TypeScript
- Material UI
- Chart.js
- Web Speech API
- Local Storage for data persistence

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/jloomis87/budget-friendly.git
   cd budget-friendly
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

### Adding Transactions

- Use the manual transaction entry form
- Or use voice commands by clicking the microphone button and saying:
  - "Add expense to essentials for groceries $150"
  - "I spent $75 on dinner with friends"

### Updating Transactions

- Edit transactions directly in the table
- Or use voice commands:
  - "Update mortgage to $2000"
  - "Change rent payment to 1250 dollars"

### Categorizing Transactions

- Drag and drop transactions between category tables
- The budget summary will update automatically

## License

MIT

## Acknowledgments

- The 50/30/20 budget rule by Elizabeth Warren
- Material UI for the component library
- Chart.js for data visualization

# Budget Friendly - 50/30/20 Budget Planner

Budget Friendly is a web application that helps you analyze your bank statements and create a personalized 50/30/20 budget plan. The 50/30/20 rule is a simple budgeting method that suggests allocating:

- 50% of your income to essentials (housing, food, utilities)
- 30% to wants (entertainment, dining out, shopping)
- 20% to savings and debt repayment

## Features

- Upload bank statements in CSV or PDF format
- Automatic transaction categorization into Essentials, Wants, Savings, and Income
- Review and analyze your spending patterns
- Generate a personalized 50/30/20 budget plan
- Get actionable suggestions to improve your financial health
- Data privacy: All processing happens locally in your browser

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/budgetFriendly.git
   cd budgetFriendly
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Upload Bank Statements**
   - Click on the upload area or drag and drop your bank statement files
   - Supported formats: CSV and PDF
   - You can upload multiple files at once

2. **Review Transactions**
   - Review the parsed transactions
   - Transactions are automatically categorized based on description and amount
   - Proceed to the budget plan

3. **View Budget Plan**
   - See your income and expense summary
   - View your spending distribution across categories
   - Compare your actual spending with the recommended 50/30/20 allocation
   - Read personalized suggestions to improve your budget

## File Format Support

### CSV Files
The application attempts to automatically detect the columns for date, description, and amount in your CSV files. For best results, ensure your CSV files have headers and contain these fields.

### PDF Files
PDF parsing is more complex and may not work with all bank statement formats. The application looks for patterns of dates, descriptions, and amounts in the text.

## Technologies Used

- React
- TypeScript
- Vite
- Material UI
- Chart.js
- Papa Parse (CSV parsing)
- PDF.js (PDF parsing)

## Privacy

Budget Friendly processes all data locally in your browser. Your financial data never leaves your device, ensuring complete privacy.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- The 50/30/20 budgeting rule was popularized by Senator Elizabeth Warren in her book "All Your Worth: The Ultimate Lifetime Money Plan"

# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

This template includes three Dockerfiles optimized for different package managers:

- `Dockerfile` - for npm
- `Dockerfile.pnpm` - for pnpm
- `Dockerfile.bun` - for bun

To build and run using Docker:

```bash
# For npm
docker build -t my-app .

# For pnpm
docker build -f Dockerfile.pnpm -t my-app .

# For bun
docker build -f Dockerfile.bun -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
