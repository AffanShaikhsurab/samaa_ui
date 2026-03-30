import 'package:flutter/material.dart';

class SurfaceHeader extends StatelessWidget {
  final String title;
  final String subtitle;

  const SurfaceHeader({Key? key, required this.title, this.subtitle = ''})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          title.toString(),
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Color(0xFF111827)),
        ),
        SizedBox(height: 6),
        Text(
          subtitle.toString(),
          style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
        ),
      ],
    );
  }
}
