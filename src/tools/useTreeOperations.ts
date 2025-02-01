import { noteType } from "./types";
import { db_Dexie } from "./dbDexie";
import { MoveHandler, RenameHandler, DeleteHandler, NodeApi } from "react-arborist";

export const useTreeOperations = () => {

    const handleMove: MoveHandler<noteType> = async ({
        dragIds,
        dragNodes,
        parentId,
        parentNode,
        index,
    }) => {
        if (!dragIds.length) return;

        const dragIdSet = new Set(dragIds); // Improve lookup performance
        const notes = await db_Dexie.notes.orderBy("order").toArray();

        const draggedNotes = notes.filter(note => dragIdSet.has(note.id));
        const remainingNotes = notes.filter(note => !dragIdSet.has(note.id));

        // Group remaining notes by parentId
        const notesByParent = new Map<string | null, noteType[]>();
        remainingNotes.forEach(note => {
            const key = note.parentId ?? null; // Determine the parent key 
            if (!notesByParent.has(key)) {  //Check if this parent already exists in the Map
                notesByParent.set(key, []);
            }
            notesByParent.get(key)!.push(note); // Add the note to the parent
        });

        // Determine target parent and its children
        const targetParentKey = parentId ?? ""; //If parentId is null ==> empty string ("").
        let targetChildren = notesByParent.get(targetParentKey) || [];

        let adjustedIndex = index;

        // Adjust index if moving within the same parent
        if (parentId === draggedNotes[0].parentId) {
            const originalParentChildren = notes.filter(n => n.parentId === parentId); // all the notes in the same parent.
            const firstDraggedIndex = originalParentChildren.findIndex(n => dragIdSet.has(n.id));// index of the first dragged note in the parent.
            if (firstDraggedIndex < index) {
                adjustedIndex -= draggedNotes.length; // If moving downward, adjust index
            }
        }

        // Handle Root Folder Moves
        if (!parentNode) {
            if (dragNodes[0].data.parentId !== "") {
                console.log("dragged from a folder"); // Dragged from a folder
            } else {
                //index of the dragged note
                const firstDraggedIndex = notes.findIndex(note => dragIdSet.has(note.id));
                if (firstDraggedIndex < index) {
                    // adjustedIndex Moving downward in the root folder
                    adjustedIndex -= draggedNotes.length;
                }
            }
        }

        // Ensure index is within bounds
        adjustedIndex = Math.max(0, Math.min(adjustedIndex, targetChildren.length));

        // Update parentId for dragged notes
        draggedNotes.forEach(note => (note.parentId = parentId ?? ""));

        // Insert dragged notes at adjusted index
        targetChildren.splice(adjustedIndex, 0, ...draggedNotes);
        // updates the notesByParent map by setting targetParentKey (the parent folder ID) to targetChildren (the newly updated)
        notesByParent.set(targetParentKey, targetChildren);

        // Recalculate order and update DB
        const reorderedNotes = [...notesByParent.values()].flat().map((note, idx) => ({
            ...note,
            order: idx + 1,
        }));

        try {
            await db_Dexie.notes.bulkPut(reorderedNotes);
        } catch (error) {
            console.error("Failed to update notes order:", error);
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