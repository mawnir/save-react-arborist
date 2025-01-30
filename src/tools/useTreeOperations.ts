import { noteType } from "./types";
import { db_Dexie } from "./dbDexie";
import { MoveHandler, RenameHandler, DeleteHandler, NodeApi } from "react-arborist";

export const useTreeOperations = () => {

    const handleMove: MoveHandler<noteType> = async (args: {
        dragIds: string[];
        dragNodes: NodeApi<noteType>[];
        parentId: null | string;
        parentNode: NodeApi<noteType> | null;
        index: number;
    }) => {
        const { dragIds, parentId, index, parentNode, dragNodes } = args;

        //console.log("dragNodes[0].data.parentId:", dragNodes[0].data.parentId);

        const notes = await db_Dexie.notes.orderBy("order").toArray();
        const currentNotes = [...notes];

        const draggedNotes = currentNotes.filter(note => dragIds.includes(note.id));

        const remainingNotes = currentNotes.filter(note => !dragIds.includes(note.id));

        // Group remaining notes by their parentId
        const notesByParent = new Map<string | null, noteType[]>();
        remainingNotes.forEach(note => {
            const key = note.parentId ?? null;
            if (!notesByParent.has(key)) {
                notesByParent.set(key, []);
            }
            notesByParent.get(key)!.push(note);
        });
        //console.log("notesByParent:", notesByParent);

        // Determine Target Parent and Children
        const targetParentKey = parentId ?? "";
        let targetChildren = notesByParent.get(targetParentKey) || [];

        let adjustedIndex = index;

        // Adjust index if moving within the same parent
        if (draggedNotes.length > 0 && parentId === draggedNotes[0].parentId) {
            const originalParentChildren = currentNotes.filter(n => n.parentId === parentId);
            const firstDraggedIndexInParent = originalParentChildren.findIndex(n => dragIds.includes(n.id));
            if (firstDraggedIndexInParent < index) {
                adjustedIndex -= draggedNotes.length;
            }
        }
        // Handle Root Folder Moves = Adjust index
        if (parentNode === null) {
            if (dragNodes[0].data.parentId !== "") {
                console.log("dragged from a folder");
            } else {
                //index of the dragged note
                const firstDraggedIndex = currentNotes.findIndex(note => dragIds.includes(note.id));
                if (firstDraggedIndex < index) {
                    // Moving downward in the root folder
                    adjustedIndex -= draggedNotes.length;
                }
            }
        }

        // Ensure the adjusted index is within valid bounds
        adjustedIndex = Math.max(0, Math.min(adjustedIndex, targetChildren.length));

        // Update parentId of dragged notes
        draggedNotes.forEach(draggedNote => {
            draggedNote.parentId = parentId === null ? "" : parentId;
        });

        // Insert dragged notes into the target parent's children at the adjusted index
        targetChildren.splice(adjustedIndex, 0, ...draggedNotes);
        notesByParent.set(targetParentKey, targetChildren);

        // Recalculate order for each parent's children
        const reorderedNotes: noteType[] = [];
        notesByParent.forEach((children) => {
            children.forEach((child, idx) => {
                reorderedNotes.push({
                    ...child,
                    order: idx + 1,
                });
            });
        });

        try {
            await db_Dexie.notes.bulkPut(reorderedNotes);
            //console.log("Notes moved and reordered successfully!");
        } catch (error) {
            console.error("Error updating the order of notes: ", error);
        }
    };

    const handleRename: RenameHandler<noteType> = async ({ name, id }) => {
        try {
            const success = await db_Dexie.notes.update(id, { title: name });
            if (!success) {
                console.log(`Note with id ${id} not found, update failed.`);
            }
        } catch (error) {
            console.error('Error updating note:', error);
        }
    };

    const handleDelete: DeleteHandler<noteType> = async (args: { ids: string[] }) => {
        try {
            await Promise.all(args.ids.map(async (id) => {
                await db_Dexie.notes.delete(id);
            }));
        } catch (error) {
            console.error('Error deleting notes:', error);
        }
    };

    return {
        handleMove,
        handleRename,
        handleDelete
    };
};

export const mapToTree = (notes: noteType[]): noteType[] => {
    const idMap: { [key: string]: noteType } = {};

    // Create a map of all nodes by ID
    notes.forEach(note => {
        idMap[note.id] = { ...note, children: [] };
    });

    // Build the tree by linking children to their parent
    const tree: noteType[] = [];
    notes.forEach(note => {
        if (note.parentId) {
            // If the note has a parent, attach it to the parent's children
            idMap[note.parentId]?.children?.push(idMap[note.id]);
        } else {
            // If it has no parent, it's a root node
            tree.push(idMap[note.id]);
        }
    });

    console.log("tree:", tree);


    return tree;
};