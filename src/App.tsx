import { Tree, NodeRendererProps, CursorProps, NodeApi } from "react-arborist";
import { useLiveQuery } from "dexie-react-hooks";
import { mapToTree, useTreeOperations } from "./tools/useTreeOperations";
import { db_Dexie } from "./tools/dbDexie";
import { noteType } from "./tools/types";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { nanoid } from "nanoid";

function App() {
  const notes = useLiveQuery(() =>
    db_Dexie.notes
      .toArray()
      .then((notes) =>
        notes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      )
  );

  const { handleMove, handleRename } = useTreeOperations();

  if (notes === undefined) {
    return <div>Loading...</div>;
  }

  const treeData = mapToTree(notes || []);

  const onCreate = async (): Promise<void> => {
    const newNote: noteType = {
      id: nanoid(),
      parentId: "",
      title: "note-" + nanoid().slice(0, 5),
      icon: "📄",
      order: 0,
    };

    try {
      await db_Dexie.notes.add({
        ...newNote
      });

      console.log("db_Dexie ok");
    } catch (error) {
      console.log("db_Dexie failed");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Save react-arborist Tree</h2>
          <button
            onClick={onCreate}
            className="px-4 py-2 bg-amber-200 text-black rounded-md flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" /> Create Note
          </button>
        </div>
        <p className="text-black">enter to rename note</p>
        <div className="border rounded-md overflow-hidden">
          <Tree
            data={treeData}
            width="100%"
            height={300}
            renderCursor={Cursor}
            onRename={handleRename}
            onMove={handleMove}>
            {Node}
          </Tree>
        </div>
        <div className="mt-6 space-y-2 bg-gray-600 p-4 rounded">
          <h3 className="font-semibold text-lg text-white">Flat Note Structure:</h3>
          {notes.map((note) => (
            <div key={note.id} className="text-sm bg-gray-50 p-2 rounded">
              <span className="font-medium text-gray-800">{note.title}</span>
              <span className="text-gray-500 ml-2">Order: {note.order}</span>
              <span className="text-gray-500 ml-2">Parent: {note.parentId || "None"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Node({ node, style, dragHandle }: NodeRendererProps<noteType>) {
  const isReceivingDrop = node.state.willReceiveDrop; // This is a boolean
  const isFocused = node.state.isFocused; // Check if the node is focused
  const isSelected = node.state.isSelected; // Check if the node is selected
  const openNote = () => {
    node.isInternal && node.toggle();
  }

  return (
    <div
      ref={dragHandle}
      style={style}
      className={`group/node ${node.state} rounded-md hover:bg-sidebar-accent cursor-pointer flex items-center h-full leading-[20px] ${isReceivingDrop ? 'bg-blue-100 border border-dashed border-blue-100' : ''
        } ${isFocused || isSelected ? 'bg-sidebar-accent font-medium  border-blue-500/30' : 'font-light'} `}
      onClick={openNote}>
      <div className="flex items-center ml-[1px] text-gray-700 h-full leading-[20px] dark:text-white">
        <FolderArrow node={node} />
        <p className="shrink-0 ml-1 mr-2 text-sm">
          {node.data.icon}
        </p>
        <span
          style={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={node.data.title}
        >{node.isEditing ? <Input node={node} /> : node.data.title && node.data.title.length > 30
          ? `${node.data.title.slice(0, 30)}...`
          : node.data.title ?? ''}</span>
      </div>
    </div>
  );
}

function Input({ node }: { node: NodeApi<noteType> }) {
  return (
    <input
      autoFocus
      type="text"
      className="flex-1 overflow-hidden text-ellipsis"
      defaultValue={node.data.title}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => node.reset()}
      onKeyDown={(e) => {
        if (e.key === "Escape") node.reset();
        if (e.key === "Enter") node.submit(e.currentTarget.value);
      }}
    />
  );
}

function FolderArrow({ node }: { node: NodeApi<noteType> }) {
  const marginLeft = node.level === 0 ? "ml-1" : ``;
  const arrowClasses = `w-4 text-gray-500 ${marginLeft} flex`;

  if (node.children && node.children.length > 0) {
    return (
      <span className={arrowClasses}>
        {node.isOpen ? <ChevronDown /> : <ChevronRight />}
      </span>
    );
  }
  return <span className={arrowClasses}></span>;
}

function Cursor({ top, left }: CursorProps) {
  return <div className="absolute w-full h-0 border-t-4 border-blue-500/30" style={{ top, left }}></div>;
}


export default App;