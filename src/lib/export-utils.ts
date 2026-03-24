import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";

// Export a single project with all related data
async function getProjectExportData(projectId: string) {
  const [
    { data: project },
    { data: changelogs },
    { data: backups },
    { data: envVars },
    { data: links },
    { data: services },
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase.from("changelogs").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("backups").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("project_env_vars").select("*").eq("project_id", projectId),
    supabase.from("project_links").select("*").eq("project_id", projectId),
    supabase.from("project_services").select("*").eq("project_id", projectId),
  ]);

  return {
    project,
    changelogs: changelogs || [],
    backups: backups || [],
    env_vars: envVars || [],
    links: links || [],
    services: services || [],
    exported_at: new Date().toISOString(),
  };
}

export async function exportSingleProject(projectId: string, projectName: string) {
  const data = await getProjectExportData(projectId);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  saveAs(blob, `${projectName}_export.json`);
}

export async function exportProjectAsZip(projectId: string, projectName: string) {
  const zip = new JSZip();
  const data = await getProjectExportData(projectId);

  const folder = zip.folder(projectName)!;
  folder.file("project.json", JSON.stringify(data.project, null, 2));
  folder.file("changelogs.json", JSON.stringify(data.changelogs, null, 2));
  folder.file("backups.json", JSON.stringify(data.backups, null, 2));
  folder.file("env_vars.json", JSON.stringify(data.env_vars, null, 2));
  folder.file("links.json", JSON.stringify(data.links, null, 2));
  folder.file("services.json", JSON.stringify(data.services, null, 2));
  folder.file("README.md", generateProjectReadme(data));

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${projectName}.zip`);
}

export async function exportMultipleProjects(projectIds: string[], fileName: string = "projects_export") {
  const zip = new JSZip();

  for (const id of projectIds) {
    const data = await getProjectExportData(id);
    const name = data.project?.name || id;
    const folder = zip.folder(name)!;
    folder.file("project.json", JSON.stringify(data.project, null, 2));
    folder.file("changelogs.json", JSON.stringify(data.changelogs, null, 2));
    folder.file("backups.json", JSON.stringify(data.backups, null, 2));
    folder.file("env_vars.json", JSON.stringify(data.env_vars, null, 2));
    folder.file("links.json", JSON.stringify(data.links, null, 2));
    folder.file("services.json", JSON.stringify(data.services, null, 2));
    folder.file("README.md", generateProjectReadme(data));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${fileName}.zip`);
}

export async function exportFolder(folderId: string, folderName: string, allProjects: any[], allFolders: any[]) {
  const zip = new JSZip();
  const rootFolder = zip.folder(folderName)!;

  // Get projects in this folder
  const folderProjects = allProjects.filter((p: any) => p.folder_id === folderId);
  for (const p of folderProjects) {
    const data = await getProjectExportData(p.id);
    const pFolder = rootFolder.folder(p.name)!;
    pFolder.file("project.json", JSON.stringify(data.project, null, 2));
    pFolder.file("changelogs.json", JSON.stringify(data.changelogs, null, 2));
    pFolder.file("backups.json", JSON.stringify(data.backups, null, 2));
    pFolder.file("env_vars.json", JSON.stringify(data.env_vars, null, 2));
    pFolder.file("links.json", JSON.stringify(data.links, null, 2));
    pFolder.file("services.json", JSON.stringify(data.services, null, 2));
    pFolder.file("README.md", generateProjectReadme(data));
  }

  // Get subfolders recursively
  const subfolders = allFolders.filter((f: any) => f.parent_id === folderId);
  for (const sf of subfolders) {
    await addFolderToZip(rootFolder, sf, allProjects, allFolders);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${folderName}.zip`);
}

async function addFolderToZip(parentZipFolder: JSZip, folder: any, allProjects: any[], allFolders: any[]) {
  const zipFolder = parentZipFolder.folder(folder.name)!;
  const folderProjects = allProjects.filter((p: any) => p.folder_id === folder.id);

  for (const p of folderProjects) {
    const data = await getProjectExportData(p.id);
    const pFolder = zipFolder.folder(p.name)!;
    pFolder.file("project.json", JSON.stringify(data.project, null, 2));
    pFolder.file("changelogs.json", JSON.stringify(data.changelogs, null, 2));
    pFolder.file("backups.json", JSON.stringify(data.backups, null, 2));
    pFolder.file("README.md", generateProjectReadme(data));
  }

  const subfolders = allFolders.filter((f: any) => f.parent_id === folder.id);
  for (const sf of subfolders) {
    await addFolderToZip(zipFolder, sf, allProjects, allFolders);
  }
}

export async function exportBackups(backupIds: string[]) {
  const { data: backups } = await supabase
    .from("backups")
    .select("*, projects(name)")
    .in("id", backupIds);

  if (!backups || backups.length === 0) return;

  if (backups.length === 1) {
    const json = JSON.stringify(backups[0], null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const name = (backups[0] as any).projects?.name || "backup";
    saveAs(blob, `backup_${name}_${new Date(backups[0].created_at).toISOString().slice(0, 10)}.json`);
    return;
  }

  const zip = new JSZip();
  for (const b of backups) {
    const name = (b as any).projects?.name || "unknown";
    const date = new Date(b.created_at).toISOString().slice(0, 10);
    zip.file(`backup_${name}_${date}_${b.id.slice(0, 8)}.json`, JSON.stringify(b, null, 2));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `backups_export_${new Date().toISOString().slice(0, 10)}.zip`);
}

export async function exportAllData() {
  const zip = new JSZip();

  const [
    { data: projects },
    { data: accounts },
    { data: backups },
    { data: connections },
  ] = await Promise.all([
    supabase.from("projects").select("*"),
    supabase.from("accounts").select("*"),
    supabase.from("backups").select("*, projects(name)"),
    supabase.from("service_connections" as any).select("*"),
  ]);

  // Export each project with full data
  const projectsFolder = zip.folder("projects")!;
  if (projects) {
    for (const p of projects) {
      const data = await getProjectExportData(p.id);
      const pFolder = projectsFolder.folder(p.name)!;
      pFolder.file("project.json", JSON.stringify(data.project, null, 2));
      pFolder.file("changelogs.json", JSON.stringify(data.changelogs, null, 2));
      pFolder.file("backups.json", JSON.stringify(data.backups, null, 2));
      pFolder.file("env_vars.json", JSON.stringify(data.env_vars, null, 2));
      pFolder.file("README.md", generateProjectReadme(data));
    }
  }

  zip.file("accounts.json", JSON.stringify(accounts || [], null, 2));
  zip.file("backups.json", JSON.stringify(backups || [], null, 2));
  zip.file("connections.json", JSON.stringify(connections || [], null, 2));
  zip.file("export_info.json", JSON.stringify({
    exported_at: new Date().toISOString(),
    total_projects: projects?.length || 0,
    total_accounts: accounts?.length || 0,
    total_backups: backups?.length || 0,
  }, null, 2));

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `devhub_full_export_${new Date().toISOString().slice(0, 10)}.zip`);
}

function generateProjectReadme(data: any): string {
  const p = data.project;
  if (!p) return "";
  return `# ${p.name}

${p.description || ""}

## פרטים
- **פלטפורמה:** ${p.platform}
- **שפה:** ${p.language || "—"}
- **קטגוריה:** ${p.category || "—"}
- **סטטוס:** ${p.status}
- **נוצר:** ${p.created_at}
- **עודכן:** ${p.updated_at}
${p.repo_url ? `- **GitHub:** ${p.repo_url}` : ""}
${p.tags?.length ? `- **תגיות:** ${p.tags.join(", ")}` : ""}

## שינויים
${data.changelogs.map((c: any) => `- [${c.change_type}] ${c.description} (${c.created_at})`).join("\n") || "אין שינויים"}

## שירותים
${data.services?.map((s: any) => `- ${s.service_name} (${s.service_type})`).join("\n") || "אין שירותים"}

---
*יוצא ב: ${data.exported_at}*
`;
}
