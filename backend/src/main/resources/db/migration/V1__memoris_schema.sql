create extension if not exists pg_trgm;

create table organizations (
    id uuid primary key,
    name varchar(180) not null,
    slug varchar(180) not null unique,
    created_at timestamp with time zone not null
);

create table app_users (
    id uuid primary key,
    full_name varchar(180) not null,
    email varchar(220) not null unique,
    password_hash varchar(255) not null,
    created_at timestamp with time zone not null
);

create table organization_members (
    id uuid primary key,
    organization_id uuid not null references organizations(id),
    user_id uuid not null references app_users(id),
    role varchar(40) not null,
    team varchar(120),
    created_at timestamp with time zone not null,
    unique (organization_id, user_id)
);

create table projects (
    id uuid primary key,
    organization_id uuid not null references organizations(id),
    name varchar(180) not null,
    team varchar(120) not null,
    created_at timestamp with time zone not null
);

create table meetings (
    id uuid primary key,
    organization_id uuid not null references organizations(id),
    project_id uuid references projects(id),
    title varchar(220) not null,
    transcript text not null,
    summary text,
    team varchar(120) not null,
    participants text,
    topics text,
    created_by uuid references app_users(id),
    created_at timestamp with time zone not null
);

create table documents (
    id uuid primary key,
    organization_id uuid not null references organizations(id),
    project_id uuid references projects(id),
    title varchar(220) not null,
    source_type varchar(60) not null,
    storage_key varchar(500),
    summary text,
    team varchar(120) not null,
    created_by uuid references app_users(id),
    created_at timestamp with time zone not null
);

create table decisions (
    id uuid primary key,
    organization_id uuid not null references organizations(id),
    meeting_id uuid references meetings(id),
    project_id uuid references projects(id),
    title varchar(220) not null,
    rationale text not null,
    status varchar(40) not null,
    team varchar(120) not null,
    created_at timestamp with time zone not null
);

create table action_items (
    id uuid primary key,
    organization_id uuid not null references organizations(id),
    meeting_id uuid references meetings(id),
    project_id uuid references projects(id),
    title varchar(220) not null,
    owner_name varchar(180) not null,
    status varchar(40) not null,
    due_date date,
    team varchar(120) not null,
    created_at timestamp with time zone not null
);

create table timeline_events (
    id uuid primary key,
    organization_id uuid not null references organizations(id),
    actor_id uuid references app_users(id),
    project_id uuid references projects(id),
    event_type varchar(60) not null,
    title varchar(240) not null,
    description text not null,
    entity_type varchar(80) not null,
    entity_id uuid,
    team varchar(120) not null,
    occurred_at timestamp with time zone not null
);

create index idx_meetings_org_team on meetings(organization_id, team);
create index idx_documents_org_team on documents(organization_id, team);
create index idx_decisions_org_team on decisions(organization_id, team);
create index idx_action_items_org_team on action_items(organization_id, team);
create index idx_timeline_org_time on timeline_events(organization_id, occurred_at desc);
create index idx_timeline_org_team on timeline_events(organization_id, team);
