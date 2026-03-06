import './ManageIssues.css';

const ManageIssues = () => (
  <section className="manage-issues page">
    <div className="container">
      <div className="manage-issues-card card">
        <h1>Manage Issues</h1>
        <p>
          Issue management UI will be wired here. Use admin API: GET /api/admin/issues,
          PATCH /api/issues/:id/status, DELETE /api/issues/:id.
        </p>
      </div>
    </div>
  </section>
);

export default ManageIssues;
