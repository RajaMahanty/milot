"use client";

import React, { useState } from "react";
import { FolderKanban, Plus, MoreVertical, LayoutGrid, Pencil, Trash2 } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { toast } from "@/store/useToastStore";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { ShareProjectModal } from "@/components/project/ShareProjectModal";
import { UserPlus } from "lucide-react";


import * as DialogPrimitive from "@radix-ui/react-dialog";

export default function ProjectsPage() {
  const { projects, setActiveProject, createProject, deleteProject, updateProject, fetchMoreProjects, hasMore, isLoading } = useProjectStore();
  const router = useRouter();
  
  const observer = React.useRef<IntersectionObserver | null>(null);
  const lastProjectElementRef = React.useCallback((node: any) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchMoreProjects();
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore, fetchMoreProjects]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingProject, setSharingProject] = useState<any>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (editingProject) {
      await updateProject(editingProject, { title: newTitle, description: newDesc });
    } else {
      await createProject({ title: newTitle, description: newDesc });
    }

    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    setNewTitle("");
    setNewDesc("");
  };

  const openEditModal = (e: React.MouseEvent, p: any) => {
    e.stopPropagation();
    setEditingProject(p.id);
    setNewTitle(p.title);
    setNewDesc(p.description || "");
    setIsModalOpen(true);
    setOpenDropdown(null);
  };

  const handleOpenProject = (id: string) => {
    setActiveProject(id);
    router.push("/board");
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteProjectId(id);
    setOpenDropdown(null);
  };

  const openShareModal = (e: React.MouseEvent, p: any) => {
    e.stopPropagation();
    setSharingProject(p);
    setIsShareModalOpen(true);
    setOpenDropdown(null);
  };

  const confirmDeleteProject = async () => {
    if (deleteProjectId) {
      await deleteProject(deleteProjectId);
      toast.success("Workspace deleted");
      setDeleteProjectId(null);
    }
  };



  const toggleDropdown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const user = useAuthStore((state) => state.user);
  const allProjects = Object.values(projects);
  const ownedProjects = allProjects.filter(p => p.uid === user?.uid);
  const sharedProjects = allProjects.filter(p => p.uid !== user?.uid);

  return (
    <div className="flex flex-col gap-8 pb-8 h-full" onClick={() => setOpenDropdown(null)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <LayoutGrid className="h-5 w-5" />
            </div>
            Workspaces
          </h2>
          <p className="text-sm text-muted-foreground mt-2 text-neutral-muted">
            Manage your personal projects and shared collaborations.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all shadow-elevated active:scale-95"
        >
          <Plus className="h-5 w-5" />
          New Workspace
        </button>
      </div>

      <div className="space-y-12 mt-4">
        {/* Owned Projects Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
             <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">My Projects</h3>
             <div className="h-[1px] flex-1 bg-border/50" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {ownedProjects.map((project, index) => (
              <ProjectCard 
                key={project.id}
                project={project}
                isOwner={true}
                onOpen={() => handleOpenProject(project.id)}
                onEdit={(e) => openEditModal(e, project)}
                onShare={(e) => openShareModal(e, project)}
                onDelete={(e) => handleDelete(e, project.id)}
                toggleDropdown={(e) => toggleDropdown(e, project.id)}
                isDropdownOpen={openDropdown === project.id}
                lastRef={index === ownedProjects.length - 1 ? lastProjectElementRef : null}
              />
            ))}

            <div
              onClick={() => setIsModalOpen(true)}
              className="flex flex-col items-center justify-center h-48 rounded-2xl border-2 border-dashed border-border bg-secondary/10 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group"
            >
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-secondary text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors mb-3">
                <Plus className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Create New Workspace</p>
            </div>
          </div>
        </div>

        {/* Shared Projects Section */}
        {sharedProjects.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
               <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Shared with Me</h3>
               <div className="h-[1px] flex-1 bg-border/50" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sharedProjects.map((project) => (
                <ProjectCard 
                  key={project.id}
                  project={project}
                  isOwner={false}
                  onOpen={() => handleOpenProject(project.id)}
                  onEdit={() => {}} 
                  onShare={() => {}}
                  onDelete={() => {}}
                  toggleDropdown={(e) => toggleDropdown(e, project.id)}
                  isDropdownOpen={openDropdown === project.id}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="mt-8 flex justify-center items-center gap-3 text-muted-foreground">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest">Loading more workspaces...</span>
        </div>
      )}

      {/* Basic Create/Edit Modal */}
      <DialogPrimitive.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay onClick={closeModal} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-6 rounded-2xl border border-border bg-card p-8 shadow-card duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-[32px]">
            <DialogPrimitive.Title aria-describedby={undefined} className="text-2xl font-bold tracking-tight">
              {editingProject ? "Edit Workspace" : "Create New Workspace"}
            </DialogPrimitive.Title>
            <form onSubmit={handleSave} className="flex flex-col gap-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground uppercase tracking-wider">Project Title</label>
                <input
                  autoFocus
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Website Redesign"
                  className="w-full rounded-xl bg-secondary/50 border border-border px-4 py-3 text-sm focus:bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground uppercase tracking-wider">Description (Optional)</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What is this project about?"
                  className="w-full rounded-xl bg-secondary/50 border border-border px-4 py-3 text-sm min-h-[100px] resize-none focus:bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                />
              </div>
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-elevated hover:opacity-90 transition-opacity active:scale-95"
                >
                  {editingProject ? "Update Workspace" : "Create Workspace"}
                </button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <ConfirmDelete
        open={!!deleteProjectId}
        onClose={() => setDeleteProjectId(null)}
        onConfirm={confirmDeleteProject}
        title="Delete Workspace?"
        description="Are you sure you want to delete this workspace? All tasks inside will be permanently removed. This cannot be undone."
      />

      <ShareProjectModal 
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        project={sharingProject}
      />
    </div>

  );
}

function ProjectCard({ 
  project, 
  isOwner, 
  onOpen, 
  onEdit, 
  onShare, 
  onDelete, 
  toggleDropdown, 
  isDropdownOpen,
  lastRef 
}: any) {
  return (
    <div
      ref={lastRef}
      onClick={onOpen}
      className="group flex flex-col justify-between h-48 rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-card hover:border-primary/30 transition-all cursor-pointer overflow-visible relative"
    >
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${isOwner ? 'from-primary to-brand-secondary' : 'from-blue-400 to-indigo-400'} opacity-40 group-hover:opacity-100 transition-opacity rounded-t-2xl`} />

      <div>
        <div className="flex items-start justify-between mb-2">
          <div className={`h-10 w-10 flex items-center justify-center rounded-xl font-bold text-xs ring-1 ring-border shadow-sm ${isOwner ? 'bg-secondary text-primary' : 'bg-blue-50 text-blue-600'}`}>
            {project.title.substring(0, 2).toUpperCase()}
          </div>
          
          {isOwner && (
            <div className="relative">
              <button
                onClick={(e) => toggleDropdown(e, project.id)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 data-[open=true]:opacity-100"
                data-open={isDropdownOpen}
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-card border border-border rounded-xl shadow-elevated z-50 p-1 animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={onEdit}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    onClick={onShare}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <UserPlus className="h-3 w-3" />
                    Share
                  </button>
                  <button
                    onClick={onDelete}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">{project.title}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{project.description || "No description provided."}</p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
          <FolderKanban className="h-3 w-3" />
          {isOwner ? "My Project" : "Shared Workspace"}
        </div>
        {!isOwner && (
          <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg">Shared</span>
        )}
      </div>
    </div>
  );
}
