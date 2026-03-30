import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class ConversationComposer extends StatefulWidget {
  final String draftText;
  final String placeholder;
  final bool showSend;
  final ValueChanged<dynamic>? onChanged;
  final VoidCallback? onSend;
  final VoidCallback? onCamera;
  final VoidCallback? onGallery;
  final VoidCallback? onMic;
  final VoidCallback? onSticker;
  final VoidCallback? onMore;

  const ConversationComposer({
    Key? key,
    this.draftText = '',
    this.placeholder = 'Message...',
    this.showSend = false,
    this.onChanged,
    this.onSend,
    this.onCamera,
    this.onGallery,
    this.onMic,
    this.onSticker,
    this.onMore,
  }) : super(key: key);

  @override
  State<ConversationComposer> createState() => _ConversationComposerState();
}

class _ConversationComposerState extends State<ConversationComposer> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.draftText);
  }

  @override
  void didUpdateWidget(covariant ConversationComposer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.draftText != widget.draftText &&
        _controller.text != widget.draftText) {
      _controller.value = TextEditingValue(
        text: widget.draftText,
        selection: TextSelection.collapsed(offset: widget.draftText.length),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: <Widget>[
        InkWell(
          onTap: widget.onCamera,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFF4A89F3),
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Icon(
              LucideIcons.camera,
              color: Colors.white,
              size: 18,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0xFF1C1C1E),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: <Widget>[
                Expanded(
                  child: TextFormField(
                    controller: _controller,
                    decoration: InputDecoration(
                      hintText: widget.placeholder,
                      hintStyle: const TextStyle(color: Color(0xFF8E8E8E)),
                    ),
                    style: const TextStyle(color: Colors.white),
                    onChanged: (dynamic value) {
                      final callback = widget.onChanged;
                      if (callback != null) {
                        callback(value);
                      }
                    },
                  ),
                ),
                const SizedBox(width: 12),
                if (!widget.showSend)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: <Widget>[
                      InkWell(
                        onTap: widget.onMic,
                        child: const Icon(
                          LucideIcons.mic,
                          color: Colors.white,
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 12),
                      InkWell(
                        onTap: widget.onGallery,
                        child: const Icon(
                          LucideIcons.image,
                          color: Colors.white,
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 12),
                      InkWell(
                        onTap: widget.onSticker,
                        child: const Icon(
                          LucideIcons.smile,
                          color: Colors.white,
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 12),
                      InkWell(
                        onTap: widget.onMore,
                        child: const Icon(
                          LucideIcons.plus,
                          color: Colors.white,
                          size: 18,
                        ),
                      ),
                    ],
                  ),
                const SizedBox(width: 12),
                if (widget.showSend)
                  InkWell(
                    onTap: widget.onSend,
                    child: const Text(
                      'Send',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF4A89F3),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
