def split_text(text, max_chars=600, overlap=120):
    """
    Splits text into chunks of maximum max_chars length, overlapping by overlap characters.
    It attempts to split on boundaries (double newlines, newlines, spaces, characters)
    recursively to avoid breaking words or sentences.
    """
    if not text:
        return []

    # Safeguard parameters to prevent infinite loop
    if max_chars <= 0:
        max_chars = 600
    if overlap >= max_chars:
        overlap = max_chars // 2
    if overlap < 0:
        overlap = 0

    text = text.strip()
    if len(text) <= max_chars:
        return [text]

    separators = ["\n\n", "\n", " ", ""]

    def _split(t, sep_idx):
        if len(t) <= max_chars:
            return [t]

        if sep_idx >= len(separators):
            # No more separators, force split by character index
            chunks = []
            start = 0
            while start < len(t):
                chunks.append(t[start:start + max_chars])
                start += max_chars - overlap
            return chunks

        sep = separators[sep_idx]
        if sep == "":
            parts = list(t)
        else:
            parts = t.split(sep)

        chunks = []
        current_parts = []
        current_len = 0

        i = 0
        while i < len(parts):
            part = parts[i]
            part_len = len(part)

            if part_len > max_chars:
                # This part alone is too large, split it recursively with the next separator
                if current_parts:
                    chunks.append(sep.join(current_parts))
                    current_parts = []
                    current_len = 0

                sub_parts = _split(part, sep_idx + 1)
                chunks.extend(sub_parts)
                i += 1
                continue

            added_len = part_len + (len(sep) if current_parts else 0)

            if current_len + added_len <= max_chars:
                current_parts.append(part)
                current_len += added_len
                i += 1
            else:
                # Store the current chunk
                if current_parts:
                    chunks.append(sep.join(current_parts))

                # Start new chunk with the current part
                current_parts = [part]
                current_len = part_len

                # Pull in previous parts for overlap
                back_idx = i - 1
                overlap_parts = []
                overlap_len = 0
                while back_idx >= 0:
                    prev_part = parts[back_idx]
                    prev_len = len(prev_part)
                    added_overlap_len = prev_len + (len(sep) if overlap_parts else 0)

                    # Fit within the overlap budget AND make sure combined chunk is within max_chars
                    if (overlap_len + added_overlap_len <= overlap) and (
                        current_len + added_overlap_len + (len(sep) if current_parts else 0) <= max_chars
                    ):
                        overlap_parts.insert(0, prev_part)
                        overlap_len += added_overlap_len
                        back_idx -= 1
                    else:
                        break

                if overlap_parts:
                    current_parts = overlap_parts + current_parts
                    current_len += overlap_len + len(sep)

                i += 1

        if current_parts:
            chunks.append(sep.join(current_parts))

        return chunks

    return [c.strip() for c in _split(text, 0) if c.strip()]
