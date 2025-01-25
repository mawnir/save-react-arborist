export type noteType = {
    id: string,
    parentId?: string,
    title?: string,
    icon?: string,
    children?: noteType[] | null,
    order?: number,

}

