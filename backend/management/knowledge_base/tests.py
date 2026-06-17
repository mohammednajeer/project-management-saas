from django.test import TestCase
from knowledge_base.chunking import split_text


class TextSplitterTests(TestCase):
    def test_short_text_no_split(self):
        text = "Hello world, this is a short text."
        chunks = split_text(text, max_chars=100)
        self.assertEqual(chunks, [text])

    def test_split_by_paragraph(self):
        text = "Paragraph one.\n\nParagraph two. Some extra text to reach chunk limit."
        # Split on '\n\n' if possible
        chunks = split_text(text, max_chars=35, overlap=10)
        self.assertEqual(chunks[0], "Paragraph one.")
        self.assertTrue("Paragraph two." in chunks[1])

    def test_split_by_newline(self):
        text = "Line number one.\nLine number two. Extra text here."
        # Split on '\n'
        chunks = split_text(text, max_chars=30, overlap=10)
        self.assertEqual(chunks[0], "Line number one.")
        self.assertTrue("Line number two." in chunks[1])

    def test_split_by_space(self):
        text = "This is a sentence with spaces."
        # Split on ' '
        chunks = split_text(text, max_chars=18, overlap=5)
        self.assertEqual(chunks[0], "This is a sentence")
        self.assertEqual(chunks[1], "with spaces.")

    def test_forced_split(self):
        text = "supercalifragilisticexpialidocious"
        # No space or newlines, must split by char
        chunks = split_text(text, max_chars=10, overlap=3)
        self.assertEqual(chunks[0], "supercalif")
        self.assertEqual(chunks[1], "lifragilis")

    def test_parameter_sanitization(self):
        text = "Hello world, this is some text."
        # Invalid parameters shouldn't cause infinite loop
        chunks_zero_max = split_text(text, max_chars=0)
        self.assertTrue(len(chunks_zero_max) > 0)

        chunks_invalid_overlap = split_text(text, max_chars=20, overlap=30)
        self.assertTrue(len(chunks_invalid_overlap) > 0)
