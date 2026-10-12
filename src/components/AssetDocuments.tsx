import { HailerApi } from '@hailer/app-sdk';
import {
  Badge, Box, Button, HStack, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter,
  ModalHeader, ModalOverlay, Spinner, Text, VStack, useColorModeValue, useToast,
} from '@chakra-ui/react';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

interface DocFile { id: string; name: string; size?: number; created?: number; }

interface Props {
  hailer: HailerApi;
  assetId: string;
  assetName: string;
  isOpen: boolean;
  onClose: () => void;
}

function fmtSize(bytes?: number): string {
  if (!bytes) return '';
  return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function base64ToFile(b64: string, name: string, type: string): File {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type });
}

// Documents attached to an asset: list, add PDFs, download, rename.
// The app SDK has no rename call, so a rename is copy-and-replace: download -> upload under the new
// name -> attach the new copy -> only then detach the old one (a failure part-way leaves the original).
export default function AssetDocuments({ hailer, assetId, assetName, isOpen, onClose }: Props) {
  const toast = useToast();
  const [files, setFiles] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowBorder = useColorModeValue('gray.100', 'gray.600');
  const muted = useColorModeValue('gray.500', 'gray.400');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const a = await hailer.activity.get(assetId);
      const raw = (a?.files ?? []) as Array<string | { _id?: string; name?: string; length?: number; created?: number }>;
      setFiles(raw.map((f) => typeof f === 'string'
        ? { id: f, name: f }
        : { id: f._id ?? '', name: f.name ?? f._id ?? 'file', size: f.length, created: f.created }).filter((f) => f.id));
    } catch (err) {
      toast({ title: 'Could not load documents', description: String((err as { msg?: string })?.msg ?? err), status: 'error' });
    }
    setLoading(false);
  }, [hailer, assetId, toast]);

  useEffect(() => { if (isOpen) void load(); }, [isOpen, load]);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (picked.length === 0) return;
    setBusy('add');
    try {
      const ids: string[] = [];
      for (const f of picked) ids.push(await hailer.file.upload(f, f.name, { isPublic: false }));
      await hailer.activity.update([{ _id: assetId }], { files: Object.fromEntries(ids.map((id) => [id, true as const])) });
      toast({ title: `${picked.length} file${picked.length === 1 ? '' : 's'} added`, status: 'success', duration: 3000 });
      await load();
    } catch (err) {
      toast({ title: 'Could not add the file', description: String((err as { msg?: string })?.msg ?? err), status: 'error', duration: 7000, isClosable: true });
    }
    setBusy(null);
  }

  async function download(f: DocFile) {
    setBusy(f.id);
    try {
      const r = await hailer.file.get(f.id);
      const url = URL.createObjectURL(base64ToFile(r.data, f.name, r.mimeType));
      const a = document.createElement('a');
      a.href = url; a.download = f.name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      toast({ title: 'Could not download', description: String((err as { msg?: string })?.msg ?? err), status: 'error' });
    }
    setBusy(null);
  }

  async function rename(f: DocFile, newNameRaw: string) {
    let newName = newNameRaw.trim();
    if (!newName || newName === f.name) { setRenaming(null); return; }
    const ext = /\.[A-Za-z0-9]{1,5}$/.exec(f.name)?.[0] ?? '';
    if (ext && !/\.[A-Za-z0-9]{1,5}$/.test(newName)) newName += ext; // keep ".pdf"
    setBusy(f.id);
    try {
      const r = await hailer.file.get(f.id);
      const newId = await hailer.file.upload(base64ToFile(r.data, newName, r.mimeType), newName, { isPublic: false });
      await hailer.activity.update([{ _id: assetId }], { files: { [newId]: true } });
      // Detach the old copy only now that the new one is attached.
      await hailer.activity.update([{ _id: assetId }], { files: { [f.id]: null } });
      toast({ title: 'Renamed', description: newName, status: 'success', duration: 3000 });
      setRenaming(null);
      await load();
    } catch (err) {
      toast({ title: 'Could not rename (the original file is untouched)', description: String((err as { msg?: string })?.msg ?? err), status: 'error', duration: 8000, isClosable: true });
    }
    setBusy(null);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <ModalHeader>
          Documents
          <Text fontSize="sm" fontWeight="normal" color={muted} noOfLines={1}>{assetName}</Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <HStack mb={3}>
            <Button size="sm" colorScheme="blue" isLoading={busy === 'add'} loadingText="Uploading..." onClick={() => inputRef.current?.click()}>
              + Add PDF / file
            </Button>
            <input ref={inputRef} type="file" multiple hidden onChange={(e) => void onPick(e)} />
            <Button size="sm" variant="ghost" onClick={() => void hailer.ui.activity.open(assetId, { tab: 'files' })}>
              Open in Hailer
            </Button>
          </HStack>

          {loading ? <HStack justify="center" py={6}><Spinner size="sm" /></HStack>
            : files.length === 0 ? <Text color={muted} fontSize="sm" py={4}>No documents on this asset yet.</Text>
            : (
              <VStack align="stretch" spacing={0}>
                {files.map((f) => (
                  <Box key={f.id} py={2} borderBottom="1px" borderColor={rowBorder}>
                    {renaming?.id === f.id ? (
                      <HStack>
                        <Input size="sm" autoFocus value={renaming.name}
                          onChange={(e) => setRenaming({ id: f.id, name: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') void rename(f, renaming.name); if (e.key === 'Escape') setRenaming(null); }} />
                        <Button size="xs" colorScheme="blue" isLoading={busy === f.id} onClick={() => void rename(f, renaming.name)}>Save</Button>
                        <Button size="xs" variant="ghost" isDisabled={busy === f.id} onClick={() => setRenaming(null)}>Cancel</Button>
                      </HStack>
                    ) : (
                      <HStack justify="space-between" align="start">
                        <Box minW={0}>
                          <Text fontSize="sm" fontWeight="medium" wordBreak="break-all">{f.name}</Text>
                          <HStack spacing={2}>
                            {f.size ? <Badge fontSize="2xs">{fmtSize(f.size)}</Badge> : null}
                            {f.created ? <Text fontSize="xs" color={muted}>{new Date(f.created).toLocaleDateString()}</Text> : null}
                          </HStack>
                        </Box>
                        <HStack spacing={1} flexShrink={0}>
                          <Button size="xs" variant="outline" isLoading={busy === f.id} onClick={() => void download(f)}>Download</Button>
                          <Button size="xs" variant="outline" isDisabled={busy === f.id} onClick={() => setRenaming({ id: f.id, name: f.name })}>Rename</Button>
                        </HStack>
                      </HStack>
                    )}
                  </Box>
                ))}
              </VStack>
            )}
          <Text fontSize="xs" color={muted} mt={4}>
            Renaming saves a new copy under the new name and removes the old one from this asset. The copy shows today's date and you as the uploader.
          </Text>
        </ModalBody>
        <ModalFooter><Button size="sm" onClick={onClose}>Close</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
}
