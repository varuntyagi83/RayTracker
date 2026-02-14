import BoardDetailClient from "./board-detail-client";

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BoardDetailClient boardId={id} />;
}
