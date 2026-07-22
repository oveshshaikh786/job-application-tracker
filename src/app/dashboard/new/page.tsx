import NewApplicationForm from "./NewApplicationForm";

export default function NewApplicationPage() {
  return (
      <section className="applications-page">
        <div className="applications-hero">
          <div>
            <p className="analytics-eyebrow">Create Record</p>
            <h1 className="analytics-title">New Application</h1>
            <p className="analytics-subtitle">
              Create a company, role, and application in one shot.
            </p>
          </div>
        </div>

        <NewApplicationForm />
      </section>
  );
}
