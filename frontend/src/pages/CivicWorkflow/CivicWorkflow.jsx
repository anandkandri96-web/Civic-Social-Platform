import { lifecycle, civicRoleSummary } from '../../utils/civicMockData';
import './CivicWorkflow.css';

const KEY_FEATURES = [
  {
    title: 'Geospatial Visualization',
    description: 'Public issue visibility on city map to identify nearby problems and hotspot clusters.',
  },
  {
    title: 'Community Voting',
    description: 'Citizen votes increase priority score so urgent issues are addressed sooner.',
  },
  {
    title: 'Automated Routing',
    description: 'Category and location route issues to the right municipal department automatically.',
  },
  {
    title: 'Escalation Rules',
    description: 'Long-pending issues escalate to higher authorities based on SLA thresholds.',
  },
  {
    title: 'Heatmap Analytics',
    description: 'Density and trend dashboards help planners detect recurring civic stress zones.',
  },
];

const CivicWorkflow = () => {
  return (
    <section className="civic-workflow page">
      <div className="container">
        <header className="civic-workflow__hero card">
          <h1>Social Civic Platform Workflow</h1>
          <p>
            A role-based civic operations model connecting citizens, volunteers, officers, field workers,
            and administrators from reporting to closure.
          </p>
        </header>

        <section className="civic-workflow__section">
          <h2>System Roles and Responsibilities</h2>
          <div className="civic-workflow__role-grid">
            {civicRoleSummary.map((role) => (
              <article key={role.role} className="civic-workflow__role-card card">
                <h3>{role.role}</h3>
                <p>{role.purpose}</p>
                <ul>
                  {role.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="civic-workflow__section civic-workflow__section--paths">
          <h2>Issue Lifecycle Paths</h2>
          <div className="civic-workflow__paths-grid">
            <article className="card civic-workflow__path-card">
              <h3>Government Resolution</h3>
              <ol>
                {lifecycle.government.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </article>
            <article className="card civic-workflow__path-card">
              <h3>Community Resolution</h3>
              <ol>
                {lifecycle.community.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </article>
          </div>
        </section>

        <section className="civic-workflow__section">
          <h2>Key Platform Features</h2>
          <div className="civic-workflow__feature-grid">
            {KEY_FEATURES.map((feature) => (
              <article key={feature.title} className="card civic-workflow__feature-card">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
};

export default CivicWorkflow;
