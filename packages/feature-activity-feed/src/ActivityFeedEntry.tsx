type ActivityFeedEntryProps = {
  userId: string;
};

export function ActivityFeedEntry({ userId }: ActivityFeedEntryProps) {
  return (
    <article className="workspace-panel">
      <h2>Activity Feed</h2>
      <p>Generic activity for {userId}.</p>
    </article>
  );
}
