-- Índices compostos para paginação do feed, filtro por status e ordenação por popularidade.
CREATE INDEX "Post_createdAt_id_idx" ON "Post"("createdAt" DESC, "id" DESC);
CREATE INDEX "Post_status_createdAt_id_idx" ON "Post"("status", "createdAt" DESC, "id" DESC);
CREATE INDEX "Post_score_createdAt_id_idx" ON "Post"("score" DESC, "createdAt" DESC, "id" DESC);
