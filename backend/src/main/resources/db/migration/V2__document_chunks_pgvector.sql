create extension if not exists vector;

create table document_chunks (
    id uuid primary key,
    document_id uuid not null references documents(id) on delete cascade,
    organization_id uuid not null references organizations(id),
    project_id uuid references projects(id),
    chunk_index integer not null,
    content text not null,
    token_count integer not null,
    embedding vector(768) not null,
    team varchar(120) not null,
    created_at timestamp with time zone not null,
    unique (document_id, chunk_index)
);

create index idx_document_chunks_document on document_chunks(document_id);
create index idx_document_chunks_org_team on document_chunks(organization_id, team);
create index idx_document_chunks_embedding on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
