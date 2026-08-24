# Automated unification report

## Canonical source
- Conxa.rmk repository root (current implementation)

## Secondary source
- Conexa-remix

## Files that were identical or uniquely added
- .gitignore
- src/index.css
- src/data/radarMockData.ts
- src/data/mockData.ts
- src/utils/connectors.ts
- src/main.tsx
- src/components/VerificationModal.tsx
- src/components/ProfessionalDetailModal.tsx
- src/components/ReviewModal.tsx
- src/components/Navigation.tsx
- src/components/ServiceRequestForm.tsx
- src/components/AiAssistantModal.tsx
- src/components/MapComponent.tsx
- src/components/FeedbackModal.tsx
- src/components/ChatWindow.tsx
- src/components/TrustBadge.tsx
- src/components/QuoteModal.tsx
- src/components/ShareDataModal.tsx
- src/components/PrivacyBanner.tsx
- src/components/OnboardingModal.tsx
- src/components/ProfessionalCard.tsx
- src/components/radar/NewOpportunityModal.tsx
- src/components/radar/RadarDashboard.tsx
- src/components/radar/DemandLanding.tsx
- assets/.aistudio/.gitignore
- tsconfig.json
- firebase-blueprint.json
- vite.config.ts

## Conflicting files kept from canonical source
- index.html
- metadata.json
- src/context/AppContext.tsx
- src/utils/securityAuditSuite.ts
- src/types.ts
- src/App.tsx
- src/components/RoleSelectionModal.tsx
- src/components/BecomeProfessionalModal.tsx
- src/components/RequestsList.tsx
- src/components/SettingsModal.tsx
- src/components/Header.tsx
- src/components/AdminPanel.tsx
- src/components/radar/RadarTestLab.tsx
- .env.example
- server.ts

## Hardening applied
- submitQuote routed through authenticated backend authority
- completeJob routed through authenticated backend authority
- backend quote validation and job-assignment checks added
