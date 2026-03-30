import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class CommentComposer extends StatefulWidget {
  final String avatarText;
  final String draftText;
  final String placeholder;
  final String replyContext;
  final String sendLabel;
  final String gifLabel;
  final ValueChanged<dynamic>? onChanged;
  final VoidCallback? onSend;
  final VoidCallback? onClearReply;

  const CommentComposer({
    Key? key,
    this.avatarText = 'Y',
    this.draftText = '',
    this.placeholder = 'Add a comment...',
    this.replyContext = '',
    this.sendLabel = 'Post',
    this.gifLabel = 'GIF',
    this.onChanged,
    this.onSend,
    this.onClearReply,
  }) : super(key: key);

  @override
  State<CommentComposer> createState() => _CommentComposerState();
}

class _CommentComposerState extends State<CommentComposer> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.draftText);
  }

  @override
  void didUpdateWidget(covariant CommentComposer oldWidget) {
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        if (widget.replyContext.isNotEmpty)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[
              Text(
                widget.replyContext.toString(),
                style: const TextStyle(fontSize: 12, color: Color(0xFF999999)),
              ),
              InkWell(
                onTap: widget.onClearReply,
                child: const SizedBox(
                  width: 24,
                  height: 24,
                  child: Center(
                    child: Icon(
                      LucideIcons.x,
                      color: Color(0xFF999999),
                      size: 14,
                    ),
                  ),
                ),
              ),
            ],
          ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: <Widget>[
            CircleAvatar(
              radius: 18,
              backgroundColor: const Color(0xFF2A2A2A),
              child: Text(
                widget.avatarText.isNotEmpty
                    ? widget.avatarText[0].toUpperCase()
                    : 'P',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFF121212),
                  borderRadius: BorderRadius.circular(25),
                  border: Border.all(color: const Color(0xFF3A3A3A), width: 1),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: <Widget>[
                    Expanded(
                      child: TextFormField(
                        controller: _controller,
                        decoration: InputDecoration(
                          hintText: widget.placeholder,
                          hintStyle: const TextStyle(color: Color(0xFF999999)),
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
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 4,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: const Color(0xFF6B7280),
                          width: 1,
                        ),
                      ),
                      child: Text(
                        widget.gifLabel.toString(),
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            InkWell(
              onTap: widget.onSend,
              child: Text(
                widget.sendLabel.toString(),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF60A5FA),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
