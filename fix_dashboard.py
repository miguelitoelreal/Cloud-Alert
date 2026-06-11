import re

filepath = 'frontend/src/pages/DashboardPage.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove ConfirmDialog import
content = content.replace('import { ConfirmDialog } from "../components/ConfirmDialog";\n', '')

# Build old block using raw read to avoid quote issues
old_start = '      <ConfirmDialog\n        open={deleteOpen}\n        title="Eliminar monitor"\n        message={\n          deleteTarget\n            ? '

if old_start not in content:
    print('Old block start not found')
    exit(1)

idx = content.find(old_start)
start_idx = idx
# Find end of ConfirmDialog block - look for onClose prop and closing />
end_marker = '      />\n\n      <Modal\n        open={netInfoOpen}'
end_idx = content.find(end_marker)
if end_idx == -1:
    print('End marker not found')
    exit(1)

old_block = content[start_idx:end_idx]

new_block = '''      {deleteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-red-900/30 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-950/60">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Eliminar monitor</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {deleteTarget
                    ? `¿Seguro que deseas eliminar "${deleteTarget.name}"? Esta acción no se puede deshacer.`
                    : "¿Seguro que deseas eliminar este monitor?"}
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={isDeleting}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {isDeleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={netInfoOpen}'''

content = content[:start_idx] + new_block + content[end_idx + len(end_marker) - len('      <Modal\n        open={netInfoOpen}'):]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
